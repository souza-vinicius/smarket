#!/bin/bash
# ===========================================
# Mercado Esperto - Production Health Check
# ===========================================
# Checks all services and reports status
#
# Usage:
#   ./scripts/health_check.sh
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Config
API_URL="${API_URL:-http://localhost:8000}"
DISK_THRESHOLD=80
MEMORY_THRESHOLD=85

# Track overall status
ALL_PASSED=0

# Print functions
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
    ALL_PASSED=1
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_header() {
    echo ""
    echo "========================================"
    echo "$1"
    echo "========================================"
}

# Check 1: API Health Endpoint
check_api_health() {
    print_header "1. API Health Check"

    if ! command -v curl &> /dev/null; then
        print_error "curl not installed, skipping API check"
        return
    fi

    response=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/health" 2>&1 || echo "000")

    if [ "$response" = "200" ]; then
        # Get response body
        body=$(curl -s "${API_URL}/health" 2>&1 || echo '{}')
        print_success "API responding: HTTP $response"
        echo "   Response: $body"
    else
        print_error "API not responding: HTTP $response"
        echo "   Tried: ${API_URL}/health"
    fi
}

# Check 2: PostgreSQL
check_postgres() {
    print_header "2. PostgreSQL Check"

    if ! command -v docker &> /dev/null; then
        print_error "Docker not installed"
        return
    fi

    # Try to find postgres container
    container=$(docker ps --filter "name=postgres" --format "{{.Names}}" | head -n 1)

    if [ -z "$container" ]; then
        print_error "PostgreSQL container not found"
        return
    fi

    # Check if container is healthy
    health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>&1 || echo "unknown")

    if [ "$health" = "healthy" ]; then
        print_success "PostgreSQL: $container ($health)"

        # Test connection
        if docker exec "$container" pg_isready -U mercadoesperto &> /dev/null; then
            print_success "Database connection: OK"
        else
            print_error "Database connection: Failed"
        fi
    else
        print_error "PostgreSQL: $container ($health)"
    fi
}

# Check 3: Redis
check_redis() {
    print_header "3. Redis Check"

    if ! command -v docker &> /dev/null; then
        print_error "Docker not installed"
        return
    fi

    # Try to find redis container
    container=$(docker ps --filter "name=redis" --format "{{.Names}}" | head -n 1)

    if [ -z "$container" ]; then
        print_error "Redis container not found"
        return
    fi

    # Check if container is healthy
    health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>&1 || echo "unknown")

    if [ "$health" = "healthy" ]; then
        print_success "Redis: $container ($health)"

        # Test connection
        if docker exec "$container" redis-cli ping | grep -q "PONG"; then
            print_success "Redis connection: OK"
        else
            print_error "Redis connection: Failed"
        fi
    else
        print_error "Redis: $container ($health)"
    fi
}

# Check 4: LLM Provider Connectivity (non-blocking)
check_llm_provider() {
    print_header "4. LLM Provider Check (non-blocking)"

    # This is informational only - we just check if API keys are set
    if [ -f .env ]; then
        if grep -q "OPENROUTER_API_KEY=sk-" .env 2>/dev/null; then
            print_success "OpenRouter API key: Configured"
        elif grep -q "GEMINI_API_KEY=" .env 2>/dev/null; then
            print_success "Gemini API key: Configured"
        elif grep -q "OPENAI_API_KEY=" .env 2>/dev/null; then
            print_success "OpenAI API key: Configured"
        else
            print_warning "No LLM API keys found in .env"
        fi
    else
        print_warning ".env file not found, skipping LLM check"
    fi
}

# Check 5: Disk Usage
check_disk_usage() {
    print_header "5. Disk Usage"

    if ! command -v df &> /dev/null; then
        print_error "df command not available"
        return
    fi

    # Get disk usage for root partition
    usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    total=$(df -h / | tail -1 | awk '{print $2}')
    used=$(df -h / | tail -1 | awk '{print $3}')
    avail=$(df -h / | tail -1 | awk '{print $4}')

    if [ "$usage" -ge "$DISK_THRESHOLD" ]; then
        print_error "Disk usage: ${usage}% (${used}/${total} used, ${avail} available)"
        echo "   WARNING: Disk usage above ${DISK_THRESHOLD}% threshold"
    else
        print_success "Disk usage: ${usage}% (${used}/${total} used, ${avail} available)"
    fi

    # Check Docker volumes
    if command -v docker &> /dev/null; then
        docker_volumes=$(docker system df -v 2>&1 | grep "Local Volumes" | awk '{print $4}' || echo "0B")
        echo "   Docker volumes: $docker_volumes"
    fi
}

# Check 6: Memory Usage
check_memory_usage() {
    print_header "6. Memory Usage"

    if ! command -v free &> /dev/null; then
        print_error "free command not available"
        return
    fi

    # Get memory usage
    total=$(free -h | awk '/^Mem:/ {print $2}')
    used=$(free -h | awk '/^Mem:/ {print $3}')
    available=$(free -h | awk '/^Mem:/ {print $7}')
    usage=$(free | awk '/^Mem:/ {printf "%.0f", $3/$2 * 100}')

    if [ "$usage" -ge "$MEMORY_THRESHOLD" ]; then
        print_error "Memory usage: ${usage}% (${used}/${total} used, ${available} available)"
        echo "   WARNING: Memory usage above ${MEMORY_THRESHOLD}% threshold"
    else
        print_success "Memory usage: ${usage}% (${used}/${total} used, ${available} available)"
    fi

    # Show top memory consumers
    if command -v docker &> /dev/null; then
        echo ""
        echo "   Docker container memory usage:"
        docker stats --no-stream --format "   - {{.Name}}: {{.MemUsage}}" 2>/dev/null || echo "   (docker stats unavailable)"
    fi
}

# Check 7: Docker Services Status
check_docker_services() {
    print_header "7. Docker Services"

    if ! command -v docker &> /dev/null; then
        print_error "Docker not installed"
        return
    fi

    # List all running containers
    running=$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.State}}" | tail -n +2)

    if [ -z "$running" ]; then
        print_error "No Docker containers running"
        return
    fi

    print_success "Docker containers running:"
    echo "$running" | while IFS= read -r line; do
        echo "   - $line"
    done

    # Check for unhealthy containers
    unhealthy=$(docker ps --filter "health=unhealthy" --format "{{.Names}}")
    if [ -n "$unhealthy" ]; then
        print_error "Unhealthy containers detected:"
        echo "$unhealthy" | while IFS= read -r container; do
            echo "   - $container"
        done
    fi
}

# Main execution
main() {
    echo "Mercado Esperto - Production Health Check"
    echo "$(date '+%Y-%m-%d %H:%M:%S')"

    check_api_health
    check_postgres
    check_redis
    check_llm_provider
    check_disk_usage
    check_memory_usage
    check_docker_services

    # Summary
    print_header "Summary"

    if [ $ALL_PASSED -eq 0 ]; then
        print_success "All health checks passed"
        exit 0
    else
        print_error "One or more health checks failed"
        exit 1
    fi
}

# Run main function
main
