#!/bin/bash
# ===========================================
# Mercado Esperto - Database Backup Script
# ===========================================
# Creates compressed PostgreSQL backups with retention policy
#
# Retention:
#   - Daily backups: Keep last 7 days
#   - Weekly backups: Keep last 4 weeks
#
# Usage:
#   ./scripts/backup.sh
#
# Cron (daily at 3 AM):
#   0 3 * * * /home/deploy/smarket/scripts/backup.sh >> /home/deploy/smarket/logs/backup.log 2>&1

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/home/deploy/backups}"
PROJECT_DIR="${PROJECT_DIR:-/home/deploy/smarket}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-smarket-postgres-1}"
POSTGRES_USER="${POSTGRES_USER:-mercadoesperto}"
POSTGRES_DB="${POSTGRES_DB:-mercadoesperto}"
DATE=$(date '+%Y-%m-%d_%H-%M-%S')
DAY_OF_WEEK=$(date '+%u')  # 1-7 (Monday-Sunday)

# Backup paths
DAILY_DIR="${BACKUP_DIR}/daily"
WEEKLY_DIR="${BACKUP_DIR}/weekly"
BACKUP_FILE="smarket_backup_${DATE}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_success() {
    log "${GREEN}✓${NC} $1"
}

log_error() {
    log "${RED}✗${NC} $1"
}

log_warning() {
    log "${YELLOW}⚠${NC} $1"
}

# Create backup directories
create_directories() {
    mkdir -p "$DAILY_DIR" "$WEEKLY_DIR"
    log "Backup directories ready: $BACKUP_DIR"
}

# Check if Docker is available
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker not found. Cannot proceed with backup."
        exit 1
    fi

    # Check if PostgreSQL container is running
    if ! docker ps | grep -q "$POSTGRES_CONTAINER"; then
        log_error "PostgreSQL container '$POSTGRES_CONTAINER' not running"
        exit 1
    fi

    log_success "PostgreSQL container running"
}

# Create backup
create_backup() {
    log "Starting backup of database '$POSTGRES_DB'..."

    # Determine backup directory (weekly on Sundays, daily otherwise)
    if [ "$DAY_OF_WEEK" -eq 7 ]; then
        BACKUP_PATH="$WEEKLY_DIR/$BACKUP_FILE"
        log "Weekly backup (Sunday)"
    else
        BACKUP_PATH="$DAILY_DIR/$BACKUP_FILE"
        log "Daily backup"
    fi

    # Record start time
    START_TIME=$(date +%s)

    # Create backup using pg_dump inside container
    if docker exec "$POSTGRES_CONTAINER" pg_dump \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges \
        | gzip > "$BACKUP_PATH"; then

        # Calculate duration and size
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        SIZE=$(du -h "$BACKUP_PATH" | cut -f1)

        log_success "Backup created: $BACKUP_PATH"
        log "   Size: $SIZE"
        log "   Duration: ${DURATION}s"

        return 0
    else
        log_error "Backup failed"
        return 1
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."

    # Remove daily backups older than 7 days
    if [ -d "$DAILY_DIR" ]; then
        DELETED_DAILY=$(find "$DAILY_DIR" -name "*.sql.gz" -type f -mtime +7 -delete -print | wc -l)
        if [ "$DELETED_DAILY" -gt 0 ]; then
            log "   Deleted $DELETED_DAILY old daily backups (>7 days)"
        fi
    fi

    # Remove weekly backups older than 28 days (4 weeks)
    if [ -d "$WEEKLY_DIR" ]; then
        DELETED_WEEKLY=$(find "$WEEKLY_DIR" -name "*.sql.gz" -type f -mtime +28 -delete -print | wc -l)
        if [ "$DELETED_WEEKLY" -gt 0 ]; then
            log "   Deleted $DELETED_WEEKLY old weekly backups (>28 days)"
        fi
    fi

    # Count remaining backups
    DAILY_COUNT=$(find "$DAILY_DIR" -name "*.sql.gz" 2>/dev/null | wc -l)
    WEEKLY_COUNT=$(find "$WEEKLY_DIR" -name "*.sql.gz" 2>/dev/null | wc -l)

    log "   Retained: $DAILY_COUNT daily, $WEEKLY_COUNT weekly backups"
}

# Verify backup integrity
verify_backup() {
    local backup_path="$1"

    log "Verifying backup integrity..."

    # Check if file exists and is not empty
    if [ ! -f "$backup_path" ]; then
        log_error "Backup file not found: $backup_path"
        return 1
    fi

    if [ ! -s "$backup_path" ]; then
        log_error "Backup file is empty: $backup_path"
        return 1
    fi

    # Test gzip integrity
    if gzip -t "$backup_path" 2>/dev/null; then
        log_success "Backup file integrity verified"
        return 0
    else
        log_error "Backup file is corrupted"
        return 1
    fi
}

# Optional: Upload to S3-compatible storage (Backblaze B2, AWS S3, etc.)
upload_to_s3() {
    local backup_path="$1"

    # Skip if S3 not configured
    if [ -z "${S3_BUCKET:-}" ]; then
        log "S3 upload not configured (set S3_BUCKET to enable)"
        return 0
    fi

    log "Uploading to S3: $S3_BUCKET"

    # Check if AWS CLI or s3cmd is available
    if command -v aws &> /dev/null; then
        if aws s3 cp "$backup_path" "s3://$S3_BUCKET/backups/$(basename "$backup_path")"; then
            log_success "Uploaded to S3"
            return 0
        else
            log_error "S3 upload failed"
            return 1
        fi
    elif command -v s3cmd &> /dev/null; then
        if s3cmd put "$backup_path" "s3://$S3_BUCKET/backups/$(basename "$backup_path")"; then
            log_success "Uploaded to S3"
            return 0
        else
            log_error "S3 upload failed"
            return 1
        fi
    else
        log_warning "No S3 client found (install aws-cli or s3cmd)"
        return 0
    fi
}

# Check disk space
check_disk_space() {
    AVAILABLE=$(df "$BACKUP_DIR" | tail -1 | awk '{print $4}')
    AVAILABLE_GB=$((AVAILABLE / 1024 / 1024))

    if [ "$AVAILABLE_GB" -lt 1 ]; then
        log_warning "Low disk space: ${AVAILABLE_GB}GB available"
    else
        log "Disk space: ${AVAILABLE_GB}GB available"
    fi
}

# Main execution
main() {
    log "=========================================="
    log "Mercado Esperto - Database Backup"
    log "=========================================="

    check_disk_space
    create_directories
    check_docker

    if create_backup; then
        # Determine the backup path that was just created
        if [ "$DAY_OF_WEEK" -eq 7 ]; then
            BACKUP_PATH="$WEEKLY_DIR/$BACKUP_FILE"
        else
            BACKUP_PATH="$DAILY_DIR/$BACKUP_FILE"
        fi

        if verify_backup "$BACKUP_PATH"; then
            cleanup_old_backups
            upload_to_s3 "$BACKUP_PATH"

            log_success "Backup completed successfully"
            exit 0
        else
            log_error "Backup verification failed"
            exit 1
        fi
    else
        log_error "Backup creation failed"
        exit 1
    fi
}

# Run main function
main
