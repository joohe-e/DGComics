from pydantic import BaseModel

class APIConfig:
    HIGH_PERFORMANCE_MODE = True

class SankeyConfig (BaseModel):
    category: str = None
    q: list[str] | None = []
    from_: int | None = None
    to_: int | None = None