# Memory Bank Instructions

## Purpose

The Memory Bank serves as persistent project context that helps AI agents quickly understand the SMarket project without needing to re-read all documentation files. It provides a condensed, actionable reference for common development tasks.

## Structure

### brief.md
The main memory bank file containing:
- Project overview and purpose
- Architecture and tech stack
- Data model summary
- API endpoints reference
- Development commands
- Code style guidelines
- Current project state

## Usage Guidelines

### When Starting a New Task
1. The brief.md content is automatically loaded via rules
2. Use it to understand project context before making changes
3. Reference specific files mentioned in the brief for detailed implementation

### When Making Changes
1. Follow the code style guidelines documented in the brief
2. Use the correct naming conventions for the layer you're working in
3. Ensure new code follows the established patterns

### Updating the Memory Bank
Update the brief.md when:
- New major features are implemented
- Architecture changes occur
- New entities or endpoints are added
- Development workflow changes
- Important decisions are made

## Quick Reference

### Backend Development
- All models in `apps/api/src/models/`
- All schemas in `apps/api/src/schemas/`
- All routers in `apps/api/src/routers/`
- Services in `apps/api/src/services/`
- Parsers in `apps/api/src/parsers/`

### Frontend Development
- Pages in `apps/web/src/app/`
- Components in `apps/web/src/components/`
- API client in `apps/web/src/lib/api.ts`
- Types in `apps/web/src/types/index.ts`
- Hooks in `apps/web/src/hooks/`

### Key Patterns
- **Schema inheritance**: `Base → Create → Response`
- **Async DB operations**: Always use `async`/`await`
- **Type hints**: Required on all function signatures
- **Imports**: Absolute only (`from src.models.user import User`)

## Related Documentation

For detailed information, refer to:
- [`AGENTS.md`](../../AGENTS.md) - Complete AI agent guidelines
- [`CLAUDE.md`](../../CLAUDE.md) - Claude-specific instructions
- [`plans/`](../../plans/) - Architecture and implementation plans
