// Type definitions for .tscn file format (Godot 4.x)

export interface TscnHeader {
  format: number;
  loadSteps: number;
  uid?: string;
}

export interface ExtResource {
  id: string;
  type: string;
  path: string;
}

export interface SubResource {
  id: string;
  type: string;
  properties: Record<string, unknown>;
}

export interface SceneNode {
  name: string;
  type: string;
  parent: string | null;
  properties: Record<string, unknown>;
  children: SceneNode[];
}

export interface Connection {
  signal: string;
  from: string;
  to: string;
  method: string;
  flags: number;
  args?: unknown[];
}

export interface ParsedScene {
  header: TscnHeader;
  extResources: ExtResource[];
  subResources: SubResource[];
  rootNode: SceneNode | null;
  connections: Connection[];
}

// Parser state
export enum ParseState {
  ROOT = "root",
  EXT_RESOURCE = "ext_resource",
  SUB_RESOURCE = "sub_resource",
  NODE = "node",
  CONNECTION = "connection",
}

export const GODOT_4_FORMAT = 3; // Godot 4.x uses format=3
