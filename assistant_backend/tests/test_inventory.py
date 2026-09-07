from fastapi import status


def _enable_inventory(client, workspace_id, headers):
    resp = client.put(
        f"/api/v1/workspaces/{workspace_id}/modules/inventory",
        headers=headers,
        json={"enabled": True},
    )
    assert resp.status_code == status.HTTP_200_OK, resp.text


def test_warehouse_and_product_crud(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]
    _enable_inventory(client, workspace_id, headers)

    warehouse = client.post(
        f"/api/v1/workspaces/{workspace_id}/inventory/warehouses",
        headers=headers,
        json={"name": "Main Warehouse", "location": "Building A"},
    )
    assert warehouse.status_code == status.HTTP_201_CREATED, warehouse.text
    warehouse_id = warehouse.json()["warehouse_id"]

    product = client.post(
        f"/api/v1/workspaces/{workspace_id}/inventory/products",
        headers=headers,
        json={"sku": "WIDGET-001", "name": "Widget", "unit_price": 9.99, "reorder_level": 10},
    )
    assert product.status_code == status.HTTP_201_CREATED, product.text
    product_id = product.json()["product_id"]

    duplicate_sku = client.post(
        f"/api/v1/workspaces/{workspace_id}/inventory/products",
        headers=headers,
        json={"sku": "WIDGET-001", "name": "Duplicate"},
    )
    assert duplicate_sku.status_code == status.HTTP_400_BAD_REQUEST

    listed = client.get(f"/api/v1/workspaces/{workspace_id}/inventory/products", headers=headers)
    assert product_id in [p["product_id"] for p in listed.json()]

    deleted = client.delete(f"/api/v1/workspaces/{workspace_id}/inventory/warehouses/{warehouse_id}", headers=headers)
    assert deleted.status_code == status.HTTP_204_NO_CONTENT


def test_stock_movements_and_levels(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]
    _enable_inventory(client, workspace_id, headers)

    warehouse_id = client.post(
        f"/api/v1/workspaces/{workspace_id}/inventory/warehouses",
        headers=headers,
        json={"name": "Warehouse"},
    ).json()["warehouse_id"]
    product_id = client.post(
        f"/api/v1/workspaces/{workspace_id}/inventory/products",
        headers=headers,
        json={"sku": "SKU-1", "name": "Product", "reorder_level": 10},
    ).json()["product_id"]

    stock_in = client.post(
        f"/api/v1/workspaces/{workspace_id}/inventory/stock-movements",
        headers=headers,
        json={"product_id": product_id, "warehouse_id": warehouse_id, "movement_type": "in", "quantity": 50},
    )
    assert stock_in.status_code == status.HTTP_201_CREATED, stock_in.text

    over_withdraw = client.post(
        f"/api/v1/workspaces/{workspace_id}/inventory/stock-movements",
        headers=headers,
        json={"product_id": product_id, "warehouse_id": warehouse_id, "movement_type": "out", "quantity": 60},
    )
    assert over_withdraw.status_code == status.HTTP_400_BAD_REQUEST

    stock_out = client.post(
        f"/api/v1/workspaces/{workspace_id}/inventory/stock-movements",
        headers=headers,
        json={"product_id": product_id, "warehouse_id": warehouse_id, "movement_type": "out", "quantity": 45},
    )
    assert stock_out.status_code == status.HTTP_201_CREATED, stock_out.text

    levels = client.get(f"/api/v1/workspaces/{workspace_id}/inventory/stock-levels", headers=headers)
    assert levels.status_code == status.HTTP_200_OK, levels.text
    level = next(l for l in levels.json() if l["product_id"] == product_id)
    assert level["quantity_on_hand"] == 5
    assert level["low_stock"] is True

    movements = client.get(f"/api/v1/workspaces/{workspace_id}/inventory/stock-movements", headers=headers)
    assert len(movements.json()) == 2


def test_inventory_routes_403_while_module_disabled(client, signed_up_user):
    workspace_id = signed_up_user["workspace_id"]
    headers = signed_up_user["headers"]

    # Inventory is enabled by default (like every module) as of the
    # "enable all modules by default" change -- explicitly disable it here
    # to exercise the 403 path, rather than relying on a default that no
    # longer exists.
    disabled = client.put(
        f"/api/v1/workspaces/{workspace_id}/modules/inventory",
        headers=headers,
        json={"enabled": False},
    )
    assert disabled.status_code == status.HTTP_200_OK, disabled.text

    resp = client.get(f"/api/v1/workspaces/{workspace_id}/inventory/warehouses", headers=headers)
    assert resp.status_code == status.HTTP_403_FORBIDDEN
