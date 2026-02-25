from fastapi import Path, HTTPException

import store


async def get_case(case_id: str = Path(...)):
    """Dependency that validates case_id exists and returns the case."""
    case = store.cases.get(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    return case
