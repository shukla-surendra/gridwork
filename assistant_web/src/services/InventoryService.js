import http from "../http-common";
import ConfigService from "../utils/config";

const base = () => {
  const workspace_id = ConfigService.getDefaultWorkspace().workspace_id;
  return `/api/v1/workspaces/${workspace_id}/inventory`;
};

const getWarehouses = () => http.get(`${base()}/warehouses`);
const createWarehouse = (data) => http.post(`${base()}/warehouses`, data);
const updateWarehouse = (id, data) => http.put(`${base()}/warehouses/${id}`, data);
const removeWarehouse = (id) => http.delete(`${base()}/warehouses/${id}`);

const getProducts = () => http.get(`${base()}/products`);
const createProduct = (data) => http.post(`${base()}/products`, data);
const updateProduct = (id, data) => http.put(`${base()}/products/${id}`, data);
const removeProduct = (id) => http.delete(`${base()}/products/${id}`);

const getMovements = (params = {}) => http.get(`${base()}/stock-movements`, { params });
const recordMovement = (data) => http.post(`${base()}/stock-movements`, data);

const getStockLevels = () => http.get(`${base()}/stock-levels`);

const InventoryService = {
  getWarehouses, createWarehouse, updateWarehouse, removeWarehouse,
  getProducts, createProduct, updateProduct, removeProduct,
  getMovements, recordMovement,
  getStockLevels,
};

export default InventoryService;
