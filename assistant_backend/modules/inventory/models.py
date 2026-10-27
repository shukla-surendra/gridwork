import datetime
import uuid
from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from adapters.orm.models.base import Base


class Warehouse(Base):
    __tablename__ = "inv_warehouses"

    warehouse_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    location = Column(String, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.UTC), onupdate=lambda: datetime.datetime.now(datetime.UTC))


class Product(Base):
    __tablename__ = "inv_products"

    product_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    sku = Column(String, nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    unit = Column(String, nullable=False, default="pcs")
    unit_price = Column(Numeric(12, 2), nullable=True)
    reorder_level = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.UTC))
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.UTC), onupdate=lambda: datetime.datetime.now(datetime.UTC))


class StockMovement(Base):
    """An append-only ledger, never edited/deleted -- current stock is a
    query (sum of movements), not a mutable counter, so it can't drift
    out of sync with its own history."""
    __tablename__ = "inv_stock_movements"

    movement_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.workspace_id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("inv_products.product_id", ondelete="CASCADE"), nullable=False)
    warehouse_id = Column(UUID(as_uuid=True), ForeignKey("inv_warehouses.warehouse_id", ondelete="CASCADE"), nullable=False)
    movement_type = Column(String, nullable=False)  # in | out | adjustment
    quantity = Column(Integer, nullable=False)
    reference = Column(String, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.UTC))

    product = relationship("Product")
    warehouse = relationship("Warehouse")
