import uuid
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import case, select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.dependencies import get_current_user
from src.models.analysis import Analysis
from src.models.invoice import Invoice
from src.models.invoice_item import InvoiceItem
from src.models.merchant import Merchant
from src.models.user import User
from src.schemas.analysis import AnalysisResponse

router = APIRouter()


@router.get("/", response_model=List[AnalysisResponse])
async def list_analysis(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    type: Optional[str] = None,
    priority: Optional[str] = None,
    is_read: Optional[bool] = None,
    is_dismissed: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all analysis/insights for current user."""
    query = select(Analysis).where(
        Analysis.user_id == current_user.id
    )
    
    if type:
        query = query.where(Analysis.type == type)
    
    if priority:
        query = query.where(Analysis.priority == priority)
    
    if is_read is not None:
        query = query.where(Analysis.is_read == is_read)
    
    if is_dismissed is not None:
        if is_dismissed:
            query = query.where(Analysis.dismissed_at.isnot(None))
        else:
            query = query.where(Analysis.dismissed_at.is_(None))
    else:
        # By default, exclude dismissed items
        query = query.where(Analysis.dismissed_at.is_(None))
    
    query = query.order_by(
        case(
            (Analysis.priority == "critical", 1),
            (Analysis.priority == "high", 2),
            (Analysis.priority == "medium", 3),
            (Analysis.priority == "low", 4),
            else_=5
        ),
        Analysis.created_at.desc()
    ).offset(skip).limit(limit)
    
    result = await db.execute(query)
    analyses = result.scalars().all()
    
    return list(analyses)


@router.get("/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    analysis_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific analysis by ID."""
    result = await db.execute(
        select(Analysis).where(
            and_(
                Analysis.id == analysis_id,
                Analysis.user_id == current_user.id
            )
        )
    )
    analysis = result.scalar_one_or_none()
    
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )
    
    return analysis


@router.get("/dashboard/summary", response_model=dict)
async def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get dashboard summary with key metrics."""
    # Total spent this month
    today = date.today()
    first_day_of_month = today.replace(day=1)
    
    month_result = await db.execute(
        select(func.sum(Invoice.total_value)).where(
            and_(
                Invoice.user_id == current_user.id,
                func.date(Invoice.issue_date) >= first_day_of_month
            )
        )
    )
    total_month = month_result.scalar() or Decimal("0.00")
    
    # Total spent last month for comparison
    from dateutil.relativedelta import relativedelta
    last_month = today - relativedelta(months=1)
    first_day_last_month = last_month.replace(day=1)
    last_day_last_month = (today.replace(day=1)) - relativedelta(days=1)
    
    last_month_result = await db.execute(
        select(func.sum(Invoice.total_value)).where(
            and_(
                Invoice.user_id == current_user.id,
                func.date(Invoice.issue_date) >= first_day_last_month,
                func.date(Invoice.issue_date) <= last_day_last_month
            )
        )
    )
    total_last_month = last_month_result.scalar() or Decimal("0.00")
    
    # Invoice count this month
    invoice_count_result = await db.execute(
        select(func.count(Invoice.id)).where(
            and_(
                Invoice.user_id == current_user.id,
                func.date(Invoice.issue_date) >= first_day_of_month
            )
        )
    )
    invoice_count = invoice_count_result.scalar() or 0
    
    # Unread insights count
    unread_result = await db.execute(
        select(func.count(Analysis.id)).where(
            and_(
                Analysis.user_id == current_user.id,
                Analysis.is_read == False,
                Analysis.dismissed_at.is_(None)
            )
        )
    )
    unread_count = unread_result.scalar() or 0
    
    # Top merchant this month
    top_merchant_result = await db.execute(
        select(
            Merchant.name,
            func.sum(Invoice.total_value).label("total")
        ).join(
            Invoice, Invoice.merchant_id == Merchant.id
        ).where(
            and_(
                Invoice.user_id == current_user.id,
                func.date(Invoice.issue_date) >= first_day_of_month
            )
        ).group_by(
            Merchant.id
        ).order_by(
            func.sum(Invoice.total_value).desc()
        ).limit(1)
    )
    top_merchant = top_merchant_result.first()
    
    # Calculate month-over-month change
    month_change = Decimal("0.00")
    if total_last_month > 0:
        month_change = ((total_month - total_last_month) / total_last_month) * 100
    
    return {
        "total_spent_this_month": total_month,
        "total_spent_last_month": total_last_month,
        "month_over_month_change_percent": round(month_change, 2),
        "invoice_count_this_month": invoice_count,
        "unread_insights_count": unread_count,
        "top_merchant_this_month": {
            "name": top_merchant.name if top_merchant else None,
            "total": top_merchant.total if top_merchant else Decimal("0.00")
        } if top_merchant else None
    }


@router.post("/{analysis_id}/read", response_model=AnalysisResponse)
async def mark_as_read(
    analysis_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark an analysis as read."""
    result = await db.execute(
        select(Analysis).where(
            and_(
                Analysis.id == analysis_id,
                Analysis.user_id == current_user.id
            )
        )
    )
    analysis = result.scalar_one_or_none()
    
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )
    
    analysis.is_read = True
    await db.commit()
    await db.refresh(analysis)
    
    return analysis


@router.post("/{analysis_id}/dismiss", response_model=AnalysisResponse)
async def dismiss_analysis(
    analysis_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Dismiss an analysis."""
    result = await db.execute(
        select(Analysis).where(
            and_(
                Analysis.id == analysis_id,
                Analysis.user_id == current_user.id
            )
        )
    )
    analysis = result.scalar_one_or_none()
    
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )
    
    analysis.dismissed_at = datetime.utcnow()
    await db.commit()
    await db.refresh(analysis)
    
    return analysis


@router.get("/spending-trends/data", response_model=dict)
async def get_spending_trends(
    months: int = Query(6, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get spending trends over time."""
    from dateutil.relativedelta import relativedelta
    
    today = date.today()
    start_date = today - relativedelta(months=months)
    
    # Get monthly totals
    result = await db.execute(
        select(
            func.date_trunc('month', Invoice.issue_date).label("month"),
            func.sum(Invoice.total_value).label("total"),
            func.count(Invoice.id).label("invoice_count")
        ).where(
            and_(
                Invoice.user_id == current_user.id,
                Invoice.issue_date >= start_date
            )
        ).group_by(
            func.date_trunc('month', Invoice.issue_date)
        ).order_by(
            func.date_trunc('month', Invoice.issue_date)
        )
    )
    
    trends = result.all()
    
    return {
        "period_months": months,
        "trends": [
            {
                "month": t.month.strftime("%Y-%m"),
                "total": t.total or Decimal("0.00"),
                "invoice_count": t.invoice_count
            }
            for t in trends
        ]
    }


@router.get("/merchant-insights/data", response_model=dict)
async def get_merchant_insights(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get insights by merchant."""
    result = await db.execute(
        select(
            Merchant.id,
            Merchant.name,
            Merchant.category,
            func.sum(Invoice.total_value).label("total_spent"),
            func.count(Invoice.id).label("visit_count"),
            func.avg(Invoice.total_value).label("average_ticket")
        ).join(
            Invoice, Invoice.merchant_id == Merchant.id
        ).where(
            Invoice.user_id == current_user.id
        ).group_by(
            Merchant.id
        ).order_by(
            func.sum(Invoice.total_value).desc()
        ).limit(limit)
    )
    
    merchants = result.all()
    
    return {
        "merchants": [
            {
                "id": m.id,
                "name": m.name,
                "category": m.category,
                "total_spent": m.total_spent or Decimal("0.00"),
                "visit_count": m.visit_count,
                "average_ticket": round(m.average_ticket or Decimal("0.00"), 2)
            }
            for m in merchants
        ]
    }
