from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from starlette.responses import Response
from modules.access import require_module_enabled
from .commands import (
    WarehouseCommand, WarehouseUpdateCommand,
    ProductCommand, ProductUpdateCommand,
    StockMovementCommand,
)
from .dto import WarehouseDto, ProductDto, StockMovementDto, StockLevelDto, InventoryDtoMapper
from .handlers import InventoryHandler
from config import logger

MODULE_KEY = "inventory"

router = APIRouter(
    prefix="/api/v1/workspaces/{workspace_id}/inventory",
    tags=["Inventory"],
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Not found"},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"description": "Internal server error"},
        status.HTTP_403_FORBIDDEN: {"description": "Operation not permitted"},
        status.HTTP_400_BAD_REQUEST: {"description": "Bad request"},
    },
)

gate = require_module_enabled(MODULE_KEY, default_enabled=True)


# -- Warehouses -------------------------------------------------------------

@router.post("/warehouses", response_model=WarehouseDto, status_code=status.HTTP_201_CREATED)
async def create_warehouse(workspace_id: str, command: WarehouseCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    try:
        warehouse = InventoryHandler().create_warehouse(command)
        return InventoryDtoMapper.map_warehouse(warehouse)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating warehouse: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/warehouses", response_model=List[WarehouseDto])
async def list_warehouses(workspace_id: str, user: dict = Depends(gate)):
    try:
        warehouses = InventoryHandler().list_warehouses(workspace_id)
        return [InventoryDtoMapper.map_warehouse(w) for w in warehouses]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing warehouses: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/warehouses/{warehouse_id}", response_model=WarehouseDto)
async def update_warehouse(workspace_id: str, warehouse_id: str, command: WarehouseUpdateCommand, user: dict = Depends(gate)):
    command.warehouse_id = warehouse_id
    try:
        warehouse = InventoryHandler().update_warehouse(command)
        return InventoryDtoMapper.map_warehouse(warehouse)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating warehouse: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/warehouses/{warehouse_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_warehouse(workspace_id: str, warehouse_id: str, user: dict = Depends(gate)):
    try:
        InventoryHandler().delete_warehouse(warehouse_id, workspace_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting warehouse: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -- Products -----------------------------------------------------------

@router.post("/products", response_model=ProductDto, status_code=status.HTTP_201_CREATED)
async def create_product(workspace_id: str, command: ProductCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    try:
        product = InventoryHandler().create_product(command)
        return InventoryDtoMapper.map_product(product)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating product: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/products", response_model=List[ProductDto])
async def list_products(workspace_id: str, user: dict = Depends(gate)):
    try:
        products = InventoryHandler().list_products(workspace_id)
        return [InventoryDtoMapper.map_product(p) for p in products]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing products: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/products/{product_id}", response_model=ProductDto)
async def update_product(workspace_id: str, product_id: str, command: ProductUpdateCommand, user: dict = Depends(gate)):
    command.product_id = product_id
    try:
        product = InventoryHandler().update_product(command)
        return InventoryDtoMapper.map_product(product)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating product: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(workspace_id: str, product_id: str, user: dict = Depends(gate)):
    try:
        InventoryHandler().delete_product(product_id, workspace_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting product: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -- Stock movements / levels ---------------------------------------------

@router.post("/stock-movements", response_model=StockMovementDto, status_code=status.HTTP_201_CREATED)
async def record_movement(workspace_id: str, command: StockMovementCommand, user: dict = Depends(gate)):
    command.workspace_id = workspace_id
    command.created_by = user.get("user_id")
    try:
        movement = InventoryHandler().record_movement(command)
        return InventoryDtoMapper.map_movement(movement)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recording stock movement: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stock-movements", response_model=List[StockMovementDto])
async def list_movements(
    workspace_id: str,
    product_id: Optional[str] = None,
    warehouse_id: Optional[str] = None,
    user: dict = Depends(gate),
):
    try:
        movements = InventoryHandler().list_movements(workspace_id, product_id, warehouse_id)
        return [InventoryDtoMapper.map_movement(m) for m in movements]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing stock movements: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stock-levels", response_model=List[StockLevelDto])
async def get_stock_levels(workspace_id: str, user: dict = Depends(gate)):
    try:
        return InventoryHandler().get_stock_levels(workspace_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting stock levels: {e}")
        raise HTTPException(status_code=500, detail=str(e))


inventory_router = router
