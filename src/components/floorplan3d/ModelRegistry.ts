// Model Registry for SmartDine 3D Floor Planner
// Defines model mapping and procedural fallbacks for tables and furniture fixtures

import { FloorPlanItem, TableShape, FurnitureType } from '../floorplan/types';

export interface ModelMetadata {
  id: string;
  category: 'tables' | 'chairs' | 'sofas' | 'bar' | 'kitchen' | 'decor' | 'structure';
  modelPath?: string;
  proceduralType: string;
  defaultHeight: number; // in meters
}

// Registry mapping known furniture types to potential GLB models and procedural fallbacks
export const FURNITURE_MODEL_REGISTRY: Record<string, ModelMetadata> = {
  // Kitchen Equipment
  stove: {
    id: 'stove',
    category: 'kitchen',
    modelPath: '/models/kitchen/stove.glb',
    proceduralType: 'stove',
    defaultHeight: 0.9
  },
  fryer: {
    id: 'fryer',
    category: 'kitchen',
    modelPath: '/models/kitchen/fryer.glb',
    proceduralType: 'fryer',
    defaultHeight: 0.9
  },
  pizza_oven: {
    id: 'pizza_oven',
    category: 'kitchen',
    modelPath: '/models/kitchen/pizza_oven.glb',
    proceduralType: 'pizza_oven',
    defaultHeight: 1.4
  },
  sink: {
    id: 'sink',
    category: 'kitchen',
    modelPath: '/models/kitchen/sink.glb',
    proceduralType: 'sink',
    defaultHeight: 0.9
  },
  refrigerator: {
    id: 'refrigerator',
    category: 'kitchen',
    modelPath: '/models/kitchen/refrigerator.glb',
    proceduralType: 'refrigerator',
    defaultHeight: 2.0
  },
  prep_counter: {
    id: 'prep_counter',
    category: 'kitchen',
    modelPath: '/models/kitchen/prep_counter.glb',
    proceduralType: 'prep_counter',
    defaultHeight: 0.9
  },
  storage_rack: {
    id: 'storage_rack',
    category: 'kitchen',
    modelPath: '/models/kitchen/storage_rack.glb',
    proceduralType: 'storage_rack',
    defaultHeight: 1.8
  },
  kitchen_pass: {
    id: 'kitchen_pass',
    category: 'kitchen',
    modelPath: '/models/kitchen/kitchen_pass.glb',
    proceduralType: 'kitchen_pass',
    defaultHeight: 1.1
  },
  kitchen: {
    id: 'kitchen',
    category: 'kitchen',
    modelPath: '/models/kitchen/kitchen_pass.glb',
    proceduralType: 'kitchen_pass',
    defaultHeight: 1.1
  },
  service_counter: {
    id: 'service_counter',
    category: 'kitchen',
    modelPath: '/models/kitchen/service_counter.glb',
    proceduralType: 'service_counter',
    defaultHeight: 1.05
  },
  counter: {
    id: 'counter',
    category: 'kitchen',
    modelPath: '/models/kitchen/service_counter.glb',
    proceduralType: 'service_counter',
    defaultHeight: 1.05
  },

  // Utilities & Front-of-House
  cash_counter: {
    id: 'cash_counter',
    category: 'bar',
    modelPath: '/models/bar/pos_counter.glb',
    proceduralType: 'cash_counter',
    defaultHeight: 1.05
  },
  cashier: {
    id: 'cashier',
    category: 'bar',
    modelPath: '/models/bar/pos_counter.glb',
    proceduralType: 'cash_counter',
    defaultHeight: 1.05
  },
  pos: {
    id: 'pos',
    category: 'bar',
    modelPath: '/models/bar/pos_counter.glb',
    proceduralType: 'cash_counter',
    defaultHeight: 1.05
  },
  bar_seats: {
    id: 'bar_seats',
    category: 'bar',
    modelPath: '/models/bar/bar_counter.glb',
    proceduralType: 'bar_seats',
    defaultHeight: 1.1
  },
  bar: {
    id: 'bar',
    category: 'bar',
    modelPath: '/models/bar/bar_counter.glb',
    proceduralType: 'bar_seats',
    defaultHeight: 1.1
  },
  waiting_area: {
    id: 'waiting_area',
    category: 'sofas',
    modelPath: '/models/sofas/waiting_lounge.glb',
    proceduralType: 'waiting_area',
    defaultHeight: 0.8
  },
  waiting_lounge: {
    id: 'waiting_lounge',
    category: 'sofas',
    modelPath: '/models/sofas/waiting_lounge.glb',
    proceduralType: 'waiting_area',
    defaultHeight: 0.8
  },
  waiting: {
    id: 'waiting',
    category: 'sofas',
    modelPath: '/models/sofas/waiting_lounge.glb',
    proceduralType: 'waiting_area',
    defaultHeight: 0.8
  },
  washroom: {
    id: 'washroom',
    category: 'structure',
    modelPath: '/models/structure/washroom.glb',
    proceduralType: 'washroom',
    defaultHeight: 2.4
  },
  accessible_washroom: {
    id: 'accessible_washroom',
    category: 'structure',
    modelPath: '/models/structure/ada_washroom.glb',
    proceduralType: 'accessible_washroom',
    defaultHeight: 2.4
  },
  emergency_exit: {
    id: 'emergency_exit',
    category: 'structure',
    modelPath: '/models/structure/exit_door.glb',
    proceduralType: 'emergency_exit',
    defaultHeight: 2.2
  },
  fire_extinguisher: {
    id: 'fire_extinguisher',
    category: 'structure',
    modelPath: '/models/structure/fire_extinguisher.glb',
    proceduralType: 'fire_extinguisher',
    defaultHeight: 0.8
  },

  // Decor & Architecture
  plant_small: {
    id: 'plant_small',
    category: 'decor',
    modelPath: '/models/decor/plant_small.glb',
    proceduralType: 'plant_small',
    defaultHeight: 0.75
  },
  plant_large: {
    id: 'plant_large',
    category: 'decor',
    modelPath: '/models/decor/plant_large.glb',
    proceduralType: 'plant_large',
    defaultHeight: 1.4
  },
  plant: {
    id: 'plant',
    category: 'decor',
    modelPath: '/models/decor/plant_large.glb',
    proceduralType: 'plant_large',
    defaultHeight: 1.4
  },
  flower_pot: {
    id: 'flower_pot',
    category: 'decor',
    modelPath: '/models/decor/flower_pot.glb',
    proceduralType: 'flower_pot',
    defaultHeight: 0.6
  },
  water_feature: {
    id: 'water_feature',
    category: 'decor',
    modelPath: '/models/decor/fountain.glb',
    proceduralType: 'water_feature',
    defaultHeight: 0.7
  },
  pillar: {
    id: 'pillar',
    category: 'structure',
    modelPath: '/models/structure/pillar.glb',
    proceduralType: 'pillar',
    defaultHeight: 2.8
  },
  column: {
    id: 'column',
    category: 'structure',
    modelPath: '/models/structure/pillar.glb',
    proceduralType: 'pillar',
    defaultHeight: 2.8
  },
  entrance_door: {
    id: 'entrance_door',
    category: 'structure',
    modelPath: '/models/structure/entrance_door.glb',
    proceduralType: 'door',
    defaultHeight: 2.2
  },
  door: {
    id: 'door',
    category: 'structure',
    modelPath: '/models/structure/entrance_door.glb',
    proceduralType: 'door',
    defaultHeight: 2.2
  },
  double_door: {
    id: 'double_door',
    category: 'structure',
    modelPath: '/models/structure/double_door.glb',
    proceduralType: 'double_door',
    defaultHeight: 2.2
  },
  sliding_door: {
    id: 'sliding_door',
    category: 'structure',
    modelPath: '/models/structure/sliding_door.glb',
    proceduralType: 'sliding_door',
    defaultHeight: 2.2
  },
  window: {
    id: 'window',
    category: 'structure',
    modelPath: '/models/structure/window.glb',
    proceduralType: 'window',
    defaultHeight: 1.5
  },
  divider: {
    id: 'divider',
    category: 'structure',
    modelPath: '/models/structure/divider.glb',
    proceduralType: 'divider',
    defaultHeight: 1.2
  },
  divider_wall: {
    id: 'divider_wall',
    category: 'structure',
    modelPath: '/models/structure/divider.glb',
    proceduralType: 'divider',
    defaultHeight: 1.2
  },
  curved_wall: {
    id: 'curved_wall',
    category: 'structure',
    modelPath: '/models/structure/curved_wall.glb',
    proceduralType: 'curved_wall',
    defaultHeight: 1.4
  },
  glass_partition: {
    id: 'glass_partition',
    category: 'structure',
    modelPath: '/models/structure/glass_partition.glb',
    proceduralType: 'glass_partition',
    defaultHeight: 1.8
  },
  decorative_partition: {
    id: 'decorative_partition',
    category: 'decor',
    modelPath: '/models/decor/decorative_partition.glb',
    proceduralType: 'decorative_partition',
    defaultHeight: 1.6
  },
  sofa: {
    id: 'sofa',
    category: 'sofas',
    modelPath: '/models/sofas/sofa.glb',
    proceduralType: 'sofa',
    defaultHeight: 0.85
  },
  sofa_lounge: {
    id: 'sofa_lounge',
    category: 'sofas',
    modelPath: '/models/sofas/sofa.glb',
    proceduralType: 'sofa',
    defaultHeight: 0.85
  },
  wall_art: {
    id: 'wall_art',
    category: 'decor',
    modelPath: '/models/decor/wall_art.glb',
    proceduralType: 'wall_art',
    defaultHeight: 1.6
  },
  decorative_shelf: {
    id: 'decorative_shelf',
    category: 'decor',
    modelPath: '/models/decor/shelf.glb',
    proceduralType: 'decorative_shelf',
    defaultHeight: 1.5
  },
  slat_wall: {
    id: 'slat_wall',
    category: 'decor',
    modelPath: '/models/decor/slat_wall.glb',
    proceduralType: 'slat_wall',
    defaultHeight: 2.4
  },
  pendant_light: {
    id: 'pendant_light',
    category: 'decor',
    modelPath: '/models/lighting/pendant.glb',
    proceduralType: 'pendant_light',
    defaultHeight: 2.2
  },
  spotlight: {
    id: 'spotlight',
    category: 'decor',
    modelPath: '/models/lighting/spotlight.glb',
    proceduralType: 'spotlight',
    defaultHeight: 2.4
  },
  wall_sconce: {
    id: 'wall_sconce',
    category: 'decor',
    modelPath: '/models/lighting/sconce.glb',
    proceduralType: 'wall_sconce',
    defaultHeight: 1.8
  },
  ceiling_light: {
    id: 'ceiling_light',
    category: 'decor',
    modelPath: '/models/lighting/ceiling_light.glb',
    proceduralType: 'ceiling_light',
    defaultHeight: 2.4
  },
  wall_ac: {
    id: 'wall_ac',
    category: 'structure',
    modelPath: '/models/climate/wall_ac.glb',
    proceduralType: 'wall_ac',
    defaultHeight: 2.1
  },
  ceiling_ac: {
    id: 'ceiling_ac',
    category: 'structure',
    modelPath: '/models/climate/ceiling_ac.glb',
    proceduralType: 'ceiling_ac',
    defaultHeight: 2.5
  },
  window_large: {
    id: 'window_large',
    category: 'structure',
    modelPath: '/models/structure/window.glb',
    proceduralType: 'window',
    defaultHeight: 1.8
  }
};

export const TABLE_MODEL_REGISTRY: Record<string, ModelMetadata> = {
  square: {
    id: 'square',
    category: 'tables',
    modelPath: '/models/tables/square_table.glb',
    proceduralType: 'table_square',
    defaultHeight: 0.75
  },
  rectangle: {
    id: 'rectangle',
    category: 'tables',
    modelPath: '/models/tables/rect_table.glb',
    proceduralType: 'table_rectangle',
    defaultHeight: 0.75
  },
  circle: {
    id: 'circle',
    category: 'tables',
    modelPath: '/models/tables/round_table.glb',
    proceduralType: 'table_circle',
    defaultHeight: 0.75
  },
  oval: {
    id: 'oval',
    category: 'tables',
    modelPath: '/models/tables/oval_table.glb',
    proceduralType: 'table_oval',
    defaultHeight: 0.75
  },
  booth: {
    id: 'booth',
    category: 'sofas',
    modelPath: '/models/sofas/booth.glb',
    proceduralType: 'table_booth',
    defaultHeight: 0.95
  },
  two_seater: {
    id: 'two_seater',
    category: 'tables',
    modelPath: '/models/tables/two_seater.glb',
    proceduralType: 'table_two_seater',
    defaultHeight: 0.75
  },
  six_seater: {
    id: 'six_seater',
    category: 'tables',
    modelPath: '/models/tables/six_seater.glb',
    proceduralType: 'table_six_seater',
    defaultHeight: 0.75
  },
  eight_seater: {
    id: 'eight_seater',
    category: 'tables',
    modelPath: '/models/tables/eight_seater.glb',
    proceduralType: 'table_eight_seater',
    defaultHeight: 0.75
  },
  ten_seater: {
    id: 'ten_seater',
    category: 'tables',
    modelPath: '/models/tables/ten_seater.glb',
    proceduralType: 'table_ten_seater',
    defaultHeight: 0.75
  },
  l_booth: {
    id: 'l_booth',
    category: 'sofas',
    modelPath: '/models/sofas/l_booth.glb',
    proceduralType: 'table_l_booth',
    defaultHeight: 0.95
  },
  u_booth: {
    id: 'u_booth',
    category: 'sofas',
    modelPath: '/models/sofas/u_booth.glb',
    proceduralType: 'table_u_booth',
    defaultHeight: 0.95
  },
  sofa_lounge: {
    id: 'sofa_lounge',
    category: 'sofas',
    modelPath: '/models/sofas/sofa_lounge.glb',
    proceduralType: 'table_sofa_lounge',
    defaultHeight: 0.8
  },
  window_bench: {
    id: 'window_bench',
    category: 'sofas',
    modelPath: '/models/sofas/window_bench.glb',
    proceduralType: 'table_window_bench',
    defaultHeight: 0.85
  },
  vip_lounge: {
    id: 'vip_lounge',
    category: 'sofas',
    modelPath: '/models/sofas/vip_lounge.glb',
    proceduralType: 'table_vip_lounge',
    defaultHeight: 0.85
  },
  bar_table: {
    id: 'bar_table',
    category: 'bar',
    modelPath: '/models/bar/bar_table.glb',
    proceduralType: 'table_bar_table',
    defaultHeight: 1.05
  }
};

export function getModelMetadata(item: FloorPlanItem): ModelMetadata {
  if (item.kind === 'table') {
    const shape = item.shape || 'rectangle';
    return (
      TABLE_MODEL_REGISTRY[shape] || {
        id: shape,
        category: 'tables',
        modelPath: `/models/tables/${shape}.glb`,
        proceduralType: 'table_rectangle',
        defaultHeight: 0.75
      }
    );
  }

  const furnType = item.furnitureType || 'counter';
  return (
    FURNITURE_MODEL_REGISTRY[furnType] || {
      id: furnType,
      category: 'kitchen',
      modelPath: `/models/kitchen/${furnType}.glb`,
      proceduralType: 'counter',
      defaultHeight: 0.9
    }
  );
}
