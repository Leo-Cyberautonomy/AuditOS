from pydantic import BaseModel
from typing import Optional, Literal

DocCategory = Literal[
    "electricity_bill",
    "gas_bill",
    "heat_bill",
    "excel_data",
    "floor_plan",
    "equipment_list",
    "measurement_protocol",
    "photo",
    "other",
]

DocStatus = Literal["uploaded", "processing", "extracted", "error"]


class DocumentMeta(BaseModel):
    id: str
    case_id: str
    filename: str
    file_size: int
    mime_type: str
    category: Optional[DocCategory] = None
    category_confidence: Optional[int] = None
    status: DocStatus = "uploaded"
    extracted_fields_count: int = 0
    uploaded_at: str


class DocumentClassifyRequest(BaseModel):
    category: DocCategory
