"""Measures CRUD router for AuditOS."""

from fastapi import APIRouter, HTTPException
from typing import Optional

import store
from models import Measure

router = APIRouter()


@router.get("", response_model=list[Measure])
async def list_measures(case_id: str):
    if case_id not in store.cases:
        raise HTTPException(404, f"Case {case_id} not found")
    result = [m for m in store.measures.values() if m.case_id == case_id]
    return sorted(result, key=lambda m: m.measure_id)


@router.get("/summary")
async def measures_summary(case_id: str):
    if case_id not in store.cases:
        raise HTTPException(404, f"Case {case_id} not found")
    case_measures = [m for m in store.measures.values() if m.case_id == case_id]
    if not case_measures:
        return {"count": 0, "total_savings_eur": 0, "total_investment_eur": 0, "avg_payback": 0}
    return {
        "count": len(case_measures),
        "total_savings_eur": sum(m.annual_saving_eur for m in case_measures),
        "total_investment_eur": sum(m.investment_eur for m in case_measures),
        "avg_payback": round(sum(m.payback_years for m in case_measures) / len(case_measures), 1),
    }


@router.get("/{measure_id}", response_model=Measure)
async def get_measure(case_id: str, measure_id: str):
    m = store.measures.get(measure_id)
    if not m or m.case_id != case_id:
        raise HTTPException(404, f"Measure {measure_id} not found in case {case_id}")
    return m
