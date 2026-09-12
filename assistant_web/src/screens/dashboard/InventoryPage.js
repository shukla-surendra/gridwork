import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Heading, Text, HStack, VStack, Badge, IconButton, Button,
  useColorModeValue, useDisclosure, Spinner, Center, useToast,
  Tabs, TabList, TabPanels, Tab, TabPanel, Table, Thead, Tbody, Tr, Th, Td,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  FormControl, FormLabel, Input, Select, NumberInput, NumberInputField,
} from '@chakra-ui/react';
import { FiPlus, FiTrash2, FiBox } from 'react-icons/fi';
import Navbar from '../../components/dashboard/Navbar';
import Header from '../../components/dashboard/Header';
import InventoryService from '../../services/InventoryService';

export default function InventoryPage() {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const toast = useToast();
  const pageBg = useColorModeValue('gray.50', 'gray.900');
  const mainBg = useColorModeValue('gray.50', 'gray.800');

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [stockLevels, setStockLevels] = useState([]);
  const [movements, setMovements] = useState([]);

  const productModal = useDisclosure();
  const warehouseModal = useDisclosure();
  const movementModal = useDisclosure();

  const [newProduct, setNewProduct] = useState({ sku: '', name: '', unit: 'pcs', unit_price: '', reorder_level: '' });
  const [newWarehouse, setNewWarehouse] = useState({ name: '', location: '' });
  const [newMovement, setNewMovement] = useState({ product_id: '', warehouse_id: '', movement_type: 'in', quantity: '', reference: '' });

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      InventoryService.getProducts(),
      InventoryService.getWarehouses(),
      InventoryService.getStockLevels(),
      InventoryService.getMovements(),
    ])
      .then(([p, w, s, m]) => {
        setProducts(p.data);
        setWarehouses(w.data);
        setStockLevels(s.data);
        setMovements(m.data);
      })
      .catch(() => toast({ title: "Couldn't load inventory", status: "error", duration: 3000, isClosable: true }))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleCreateProduct = async () => {
    try {
      await InventoryService.createProduct({
        ...newProduct,
        unit_price: newProduct.unit_price === '' ? null : parseFloat(newProduct.unit_price),
        reorder_level: newProduct.reorder_level === '' ? null : parseInt(newProduct.reorder_level, 10),
      });
      setNewProduct({ sku: '', name: '', unit: 'pcs', unit_price: '', reorder_level: '' });
      productModal.onClose();
      loadAll();
    } catch (error) {
      toast({ title: "Couldn't create product", description: error.response?.data?.detail, status: "error", duration: 3000, isClosable: true });
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      await InventoryService.removeProduct(productId);
      loadAll();
    } catch {
      toast({ title: "Couldn't delete product", status: "error", duration: 3000, isClosable: true });
    }
  };

  const handleCreateWarehouse = async () => {
    if (!newWarehouse.name.trim()) return;
    try {
      await InventoryService.createWarehouse(newWarehouse);
      setNewWarehouse({ name: '', location: '' });
      warehouseModal.onClose();
      loadAll();
    } catch {
      toast({ title: "Couldn't create warehouse", status: "error", duration: 3000, isClosable: true });
    }
  };

  const handleDeleteWarehouse = async (warehouseId) => {
    try {
      await InventoryService.removeWarehouse(warehouseId);
      loadAll();
    } catch {
      toast({ title: "Couldn't delete warehouse", status: "error", duration: 3000, isClosable: true });
    }
  };

  const handleRecordMovement = async () => {
    if (!newMovement.product_id || !newMovement.warehouse_id || !newMovement.quantity) return;
    try {
      await InventoryService.recordMovement({
        ...newMovement,
        quantity: parseInt(newMovement.quantity, 10),
      });
      setNewMovement({ product_id: '', warehouse_id: '', movement_type: 'in', quantity: '', reference: '' });
      movementModal.onClose();
      loadAll();
    } catch (error) {
      toast({ title: "Couldn't record movement", description: error.response?.data?.detail, status: "error", duration: 4000, isClosable: true });
    }
  };

  if (loading) {
    return (
      <Box minH="100vh" bg={pageBg}>
        <Navbar isCollapsed={isMenuCollapsed} />
        <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }}>
          <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
          <Center py={20}><Spinner /></Center>
        </Box>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg={pageBg}>
      <Navbar isCollapsed={isMenuCollapsed} />
      <Box ml={{ base: 0, md: isMenuCollapsed ? '60px' : '250px' }} transition="all 0.3s ease">
        <Header onMenuToggle={() => setIsMenuCollapsed(!isMenuCollapsed)} />
        <Box as="main" p={{ base: 3, md: 4 }} minH="calc(100vh - 4rem)" bg={mainBg} borderRadius="lg" boxShadow="sm">
          <HStack mb={4}>
            <FiBox size={20} />
            <Heading size="lg">Inventory</Heading>
          </HStack>

          <Tabs colorScheme="teal">
            <TabList>
              <Tab>Stock Levels</Tab>
              <Tab>Products</Tab>
              <Tab>Warehouses</Tab>
              <Tab>Movements</Tab>
            </TabList>
            <TabPanels>
              {/* Stock Levels */}
              <TabPanel px={0}>
                <HStack justify="flex-end" mb={2}>
                  <Button size="sm" colorScheme="teal" leftIcon={<FiPlus />} onClick={movementModal.onOpen}>
                    Record Movement
                  </Button>
                </HStack>
                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Product</Th>
                        <Th>SKU</Th>
                        <Th>Warehouse</Th>
                        <Th isNumeric>On Hand</Th>
                        <Th>Status</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {stockLevels.map(level => (
                        <Tr key={`${level.product_id}-${level.warehouse_id}`}>
                          <Td>{level.product_name}</Td>
                          <Td>{level.sku}</Td>
                          <Td>{level.warehouse_name}</Td>
                          <Td isNumeric>{level.quantity_on_hand}</Td>
                          <Td>
                            {level.low_stock
                              ? <Badge colorScheme="red">Low stock</Badge>
                              : <Badge colorScheme="green">OK</Badge>}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  {stockLevels.length === 0 && (
                    <Text fontSize="sm" color="gray.400" py={4}>
                      No products/warehouses yet -- add some in the other tabs first.
                    </Text>
                  )}
                </Box>
              </TabPanel>

              {/* Products */}
              <TabPanel px={0}>
                <HStack justify="flex-end" mb={2}>
                  <Button size="sm" colorScheme="teal" leftIcon={<FiPlus />} onClick={productModal.onOpen}>
                    New Product
                  </Button>
                </HStack>
                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>SKU</Th>
                        <Th>Name</Th>
                        <Th>Unit</Th>
                        <Th isNumeric>Price</Th>
                        <Th isNumeric>Reorder Level</Th>
                        <Th></Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {products.map(product => (
                        <Tr key={product.product_id}>
                          <Td>{product.sku}</Td>
                          <Td>{product.name}</Td>
                          <Td>{product.unit}</Td>
                          <Td isNumeric>{product.unit_price != null ? `$${product.unit_price.toFixed(2)}` : '-'}</Td>
                          <Td isNumeric>{product.reorder_level ?? '-'}</Td>
                          <Td>
                            <IconButton icon={<FiTrash2 />} size="xs" variant="ghost" aria-label="Delete product" onClick={() => handleDeleteProduct(product.product_id)} />
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  {products.length === 0 && <Text fontSize="sm" color="gray.400" py={4}>No products yet.</Text>}
                </Box>
              </TabPanel>

              {/* Warehouses */}
              <TabPanel px={0}>
                <HStack justify="flex-end" mb={2}>
                  <Button size="sm" colorScheme="teal" leftIcon={<FiPlus />} onClick={warehouseModal.onOpen}>
                    New Warehouse
                  </Button>
                </HStack>
                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Name</Th>
                        <Th>Location</Th>
                        <Th></Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {warehouses.map(warehouse => (
                        <Tr key={warehouse.warehouse_id}>
                          <Td>{warehouse.name}</Td>
                          <Td>{warehouse.location || '-'}</Td>
                          <Td>
                            <IconButton icon={<FiTrash2 />} size="xs" variant="ghost" aria-label="Delete warehouse" onClick={() => handleDeleteWarehouse(warehouse.warehouse_id)} />
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  {warehouses.length === 0 && <Text fontSize="sm" color="gray.400" py={4}>No warehouses yet.</Text>}
                </Box>
              </TabPanel>

              {/* Movements */}
              <TabPanel px={0}>
                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Date</Th>
                        <Th>Product</Th>
                        <Th>Warehouse</Th>
                        <Th>Type</Th>
                        <Th isNumeric>Qty</Th>
                        <Th>Reference</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {movements.map(movement => {
                        const product = products.find(p => p.product_id === movement.product_id);
                        const warehouse = warehouses.find(w => w.warehouse_id === movement.warehouse_id);
                        return (
                          <Tr key={movement.movement_id}>
                            <Td>{new Date(movement.created_at).toLocaleString()}</Td>
                            <Td>{product?.name || movement.product_id}</Td>
                            <Td>{warehouse?.name || movement.warehouse_id}</Td>
                            <Td>
                              <Badge colorScheme={movement.movement_type === 'in' ? 'green' : movement.movement_type === 'out' ? 'red' : 'gray'}>
                                {movement.movement_type}
                              </Badge>
                            </Td>
                            <Td isNumeric>{movement.quantity}</Td>
                            <Td>{movement.reference || '-'}</Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                  {movements.length === 0 && <Text fontSize="sm" color="gray.400" py={4}>No stock movements recorded yet.</Text>}
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </Box>

      {/* New Product Modal */}
      <Modal isOpen={productModal.isOpen} onClose={productModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>New Product</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">SKU</FormLabel>
                <Input size="sm" value={newProduct.sku} onChange={(e) => setNewProduct(p => ({ ...p, sku: e.target.value }))} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Name</FormLabel>
                <Input size="sm" value={newProduct.name} onChange={(e) => setNewProduct(p => ({ ...p, name: e.target.value }))} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Unit</FormLabel>
                <Input size="sm" value={newProduct.unit} onChange={(e) => setNewProduct(p => ({ ...p, unit: e.target.value }))} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Unit Price</FormLabel>
                <NumberInput size="sm" value={newProduct.unit_price} onChange={(v) => setNewProduct(p => ({ ...p, unit_price: v }))}>
                  <NumberInputField />
                </NumberInput>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Reorder Level</FormLabel>
                <NumberInput size="sm" value={newProduct.reorder_level} onChange={(v) => setNewProduct(p => ({ ...p, reorder_level: v }))}>
                  <NumberInputField />
                </NumberInput>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={productModal.onClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleCreateProduct}>Create</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* New Warehouse Modal */}
      <Modal isOpen={warehouseModal.isOpen} onClose={warehouseModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>New Warehouse</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Name</FormLabel>
                <Input size="sm" value={newWarehouse.name} onChange={(e) => setNewWarehouse(w => ({ ...w, name: e.target.value }))} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Location</FormLabel>
                <Input size="sm" value={newWarehouse.location} onChange={(e) => setNewWarehouse(w => ({ ...w, location: e.target.value }))} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={warehouseModal.onClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleCreateWarehouse}>Create</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Record Movement Modal */}
      <Modal isOpen={movementModal.isOpen} onClose={movementModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Record Stock Movement</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={3}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Product</FormLabel>
                <Select size="sm" placeholder="Select product" value={newMovement.product_id} onChange={(e) => setNewMovement(m => ({ ...m, product_id: e.target.value }))}>
                  {products.map(p => <option key={p.product_id} value={p.product_id}>{p.name} ({p.sku})</option>)}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Warehouse</FormLabel>
                <Select size="sm" placeholder="Select warehouse" value={newMovement.warehouse_id} onChange={(e) => setNewMovement(m => ({ ...m, warehouse_id: e.target.value }))}>
                  {warehouses.map(w => <option key={w.warehouse_id} value={w.warehouse_id}>{w.name}</option>)}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Type</FormLabel>
                <Select size="sm" value={newMovement.movement_type} onChange={(e) => setNewMovement(m => ({ ...m, movement_type: e.target.value }))}>
                  <option value="in">Stock In</option>
                  <option value="out">Stock Out</option>
                  <option value="adjustment">Adjustment</option>
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Quantity</FormLabel>
                <NumberInput size="sm" value={newMovement.quantity} onChange={(v) => setNewMovement(m => ({ ...m, quantity: v }))}>
                  <NumberInputField />
                </NumberInput>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Reference</FormLabel>
                <Input size="sm" placeholder="e.g. PO-1001" value={newMovement.reference} onChange={(e) => setNewMovement(m => ({ ...m, reference: e.target.value }))} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={movementModal.onClose}>Cancel</Button>
            <Button colorScheme="teal" onClick={handleRecordMovement}>Record</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
