import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Box, Flex, Text, HStack, Badge, useColorModeValue, useToast,
} from '@chakra-ui/react';
import {
  DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, useDroppable,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { editDeal, fetchDeals } from '../../slices/crm/dealsSlice';
import { DEAL_STAGES, STAGE_LABELS, getStageColor } from './dealStages';

function DealCard({ deal, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.deal_id });
  const cardBg = useColorModeValue('white', 'gray.700');
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      bg={cardBg}
      p={3}
      mb={2}
      borderRadius="md"
      boxShadow="sm"
      cursor="grab"
      onClick={() => onClick(deal)}
      _hover={{ boxShadow: 'md' }}
    >
      <Text fontSize="sm" fontWeight="medium" mb={1} noOfLines={2}>{deal.title}</Text>
      <Text fontSize="xs" color="gray.500" mb={1}>
        {deal.contact ? `${deal.contact.first_name} ${deal.contact.last_name}` : 'No contact'}
      </Text>
      <HStack justify="space-between">
        <Text fontSize="sm" fontWeight="bold" color="green.600">
          ${(deal.value || 0).toLocaleString()}
        </Text>
        {deal.probability != null && (
          <Badge fontSize="2xs" colorScheme="gray">{deal.probability}%</Badge>
        )}
      </HStack>
    </Box>
  );
}

function StageColumn({ stage, deals, onCardClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const columnBg = useColorModeValue('gray.100', 'gray.900');
  const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);

  return (
    <Box
      ref={setNodeRef}
      bg={isOver ? 'teal.50' : columnBg}
      borderRadius="lg"
      p={3}
      minW="270px"
      maxW="270px"
      flexShrink={0}
      transition="background 0.15s ease"
    >
      <HStack justify="space-between" mb={1}>
        <HStack>
          <Text fontWeight="bold" fontSize="sm">{STAGE_LABELS[stage] || stage}</Text>
          <Badge borderRadius="full" colorScheme={getStageColor(stage)}>{deals.length}</Badge>
        </HStack>
      </HStack>
      <Text fontSize="xs" color="gray.500" mb={3}>${totalValue.toLocaleString()}</Text>
      <SortableContext items={deals.map(d => d.deal_id)} strategy={verticalListSortingStrategy}>
        <Box minH="40px">
          {deals.map(deal => (
            <DealCard key={deal.deal_id} deal={deal} onClick={onCardClick} />
          ))}
        </Box>
      </SortableContext>
    </Box>
  );
}

export default function DealsPipeline({ deals, workspaceId, onCardClick }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const [dealsByStage, setDealsByStage] = useState({});
  const [activeDeal, setActiveDeal] = useState(null);

  const groupDeals = (list) => {
    const grouped = Object.fromEntries(DEAL_STAGES.map(s => [s, []]));
    for (const deal of list) {
      const stage = DEAL_STAGES.includes(deal.stage) ? deal.stage : 'new';
      (grouped[stage] || (grouped[stage] = [])).push(deal);
    }
    for (const stage of Object.keys(grouped)) {
      grouped[stage].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return grouped;
  };

  useEffect(() => { setDealsByStage(groupDeals(deals || [])); }, [deals]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const findContainer = (id) => {
    if (id in dealsByStage) return id;
    return Object.keys(dealsByStage).find(s => dealsByStage[s].some(d => d.deal_id === id));
  };

  const handleDragStart = (event) => {
    const deal = Object.values(dealsByStage).flat().find(d => d.deal_id === event.active.id);
    setActiveDeal(deal);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;
    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setDealsByStage(prev => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      const activeIndex = activeItems.findIndex(d => d.deal_id === active.id);
      const overIndex = overItems.findIndex(d => d.deal_id === over.id);
      const movedDeal = { ...activeItems[activeIndex], stage: overContainer };
      const newOverIndex = overIndex >= 0 ? overIndex : overItems.length;
      return {
        ...prev,
        [activeContainer]: activeItems.filter(d => d.deal_id !== active.id),
        [overContainer]: [
          ...overItems.slice(0, newOverIndex),
          movedDeal,
          ...overItems.slice(newOverIndex),
        ],
      };
    });
  };

  const persistStage = (stage, stageDeals) => {
    return Promise.all(stageDeals.map((deal, index) =>
      dispatch(editDeal({
        workspaceId,
        dealId: deal.deal_id,
        dealData: { stage, order: index },
      })).unwrap()
    ));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveDeal(null);
    if (!over) return;

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);
    if (!activeContainer || !overContainer) return;

    let finalDealsByStage = dealsByStage;
    if (activeContainer === overContainer && active.id !== over.id) {
      const items = dealsByStage[activeContainer];
      const oldIndex = items.findIndex(d => d.deal_id === active.id);
      const newIndex = items.findIndex(d => d.deal_id === over.id);
      finalDealsByStage = { ...dealsByStage, [activeContainer]: arrayMove(items, oldIndex, newIndex) };
      setDealsByStage(finalDealsByStage);
    }

    const stagesToSave = new Set([activeContainer, overContainer]);
    stagesToSave.forEach(stage => {
      persistStage(stage, finalDealsByStage[stage]).catch(() => {
        toast({ title: "Couldn't save pipeline change", status: 'error', duration: 3000, isClosable: true });
        dispatch(fetchDeals(workspaceId));
      });
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <Flex gap={4} overflowX="auto" pb={4} align="flex-start">
        {DEAL_STAGES.map(stage => (
          <StageColumn
            key={stage}
            stage={stage}
            deals={dealsByStage[stage] || []}
            onCardClick={onCardClick}
          />
        ))}
      </Flex>
      <DragOverlay>
        {activeDeal ? (
          <Box bg="white" p={3} borderRadius="md" boxShadow="lg" maxW="250px">
            <Text fontSize="sm" fontWeight="medium">{activeDeal.title}</Text>
          </Box>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
