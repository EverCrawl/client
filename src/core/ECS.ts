import { Constructor, InstanceTypeTuple, TypeOf } from "core/utils";

/**
 * An opaque identifier used to access component arrays
 */
export type Entity = number;

/**
 * Stores arbitrary data
 */
export type Component = {
    free?: () => void;
    [x: string]: any;
    [x: number]: any;
}

/**
 * Smallest logical unit of the game
 */
export interface System {
    (registry: Registry, ...args: any[]): void;
}

export type View<Types extends Component[]> = Iterable<[Entity, ...Types]>;

export const Null: Entity = -1 >>> 0;

/**
 * Registry holds all components in arrays
 *
 * Component types must be registered first
 */
export class Registry {
    private entitySequence: Entity = 0 >>> 0;
    private entities: Set<Entity> = new Set;
    private components: Map<string, Map<Entity, Component>> = new Map;

    // TODO: store entities and components by archetype

    /**
     * Creates an entity from provided components (if any)
     */
    create<T extends Component[]>(...components: T): Entity {
        const entity = this.entitySequence++ >>> 0;
        this.entities.add(entity);

        // emplace all components into entity
        for (let i = 0, len = components.length; i < len; ++i) {
            this.emplace(entity, components[i]);
        }

        return entity;
    }

    insert<T extends Component[]>(entity: Entity, ...components: T): Entity {
        if (this.entities.has(entity)) {
            throw new Error(`Attempted to insert duplicate entity ${entity}`);
        }
        this.entities.add(entity);
        for (let i = 0, len = components.length; i < len; ++i) {
            this.emplace(entity, components[i]);
        }
        return entity;
    }

    /**
     * Returns true if `entity` is in the registry
     */
    alive(entity: Entity): boolean {
        return this.entities.has(entity);
    }

    /**
     * Destroys an entity and all its components
     * 
     * Calls `.free()` on each destroyed component
     * 
     * Example:
     * ```
     */
    destroy(entity: Entity) {
        this.entities.delete(entity);
        for (const list of this.components.values()) {
            const component = list.get(entity);
            if (component?.free) component.free();
            list.delete(entity);
        }
    }


    /**
     * Retrieves component of type `type` for `entity`
     * 
     * Example:
     * ```
     *  const registry = new Registry();
     *  const entity = registry.create();
     *  registry.emplace(entity, new Component);
     *  // ...
     *  const component = registry.get(entity, Component);
     * ```
     */
    get<T extends Component>(entity: Entity, component: Constructor<T>): T | null {
        const type = TypeOf(component);

        // can't get for "dead" entity
        if (!this.entities.has(entity)) {
            throw new Error(`Cannot get component "${TypeOf(component)}" for dead entity ID ${entity}`);
        }

        return this.components.get(type)?.get(entity) as T ?? null;
    }

    /**
     * Used to check if `entity` has instance of `component`.
     * 
     * Example:
     * ```
     *  const registry = new Registry();
     *  const entity = registry.create();
     *  registry.has(entity, Component); // false
     *  registry.emplace(entity, new Component);
     *  registry.has(entity, Component); // true
     * ```
     */
    has<T extends Component>(entity: Entity, component: Constructor<T>) {
        return this.components.get(TypeOf(component))?.has(entity) ?? false;
    }

    /**
     * Sets `entity`'s instance of component `type` to `component`.
     * 
     * **Warning:** Overwrites any existing instance of the component!
     * Use `has` to check for existence first, if this is undesirable.
     * 
     * Example:
     * ```
     *  const entity = registry.create();
     *  registry.emplace(new Component, entity);
     * ```
     */
    emplace<T extends Component>(entity: Entity, component: T) {
        const type = TypeOf(component);

        if (!this.entities.has(entity)) {
            throw new Error(`Cannot set component "${TypeOf(component)}" for dead entity ID ${entity}`);
        }

        let list = this.components.get(type);
        if (list == null) {
            list = new Map();
            this.components.set(type, list);
        }
        list.set(entity, component);
    }

    /**
     * Removes instance of `component` from `entity`. Also returns the removed component.
     * 
     * Example:
     * ```
     *  const registry = new Registry();
     *  const entity = registry.create();
     *  registry.emplace(entity, new Component);
     *  // ...
     *  registry.remove(entity, Component); // true
     * ```
     */
    remove<T extends Component>(entity: Entity, component: Constructor<T>): T | null {
        const type = TypeOf(component);

        // can't remove for "dead" entity
        if (!this.entities.has(entity)) {
            throw new Error(`Cannot remove component "${TypeOf(component)}" for dead entity ID ${entity}`);
        }

        const list = this.components.get(type);
        if (list == null) {
            return null;
        }
        const _component = list?.get(entity);
        list.delete(entity);
        return _component as T ?? null;
    }

    /**
     * Constructs a view into the registry from the given component types.
     * The view will contain every entity which has the given component types.
     * 
     * If no component types are provided, returns every entity
     * in the registry.
     * 
     * The resulting View type is a tuple consisting of the entity and
     * 0 or more components. It is also `Iterable`, so you can use it in a loop,
     * or convert it to an array and use array methods on it.
     * 
     * Example:
     * ```
     *  // Note that components MUST be classes.
     *  class Position {
     *      x: number = 0;
     *      y: number = 0;
     *  }
     *  class Velocity {
     *      x: number = 0;
     *      y: number = 0;
     *  }
     * 
     *  // this would be your classic position system
     *  for(const [entity, pos, vel] of registry.view(Position, Velocity)) {
     *      pos.x += vel.x;
     *      pos.y += vel.y;
     *  }
     * 
     *  // note that this is usually at least ~10x slower than the above,
     *  // and you should always iterate over views directly.
     *  // to array
     *  const view = Array.from(registry.view(A, B));
     *  // or using spread operator
     *  const view = [...registry.view(A, B)];
     *  // and use array methods...
     *  view.forEach(([entity, a, b]) => console.log(entity, a, b));
     *  view.reduce((acc, [entity, a, b]) => acc += (a.val + b.val));
     * ```
     */
    view<T extends Constructor<Component>[]>(...types: T): View<InstanceTypeTuple<T>> {
        return this.generateView(this, types) as View<InstanceTypeTuple<T>>;
    }

    /**
     * Returns the size of the registry (how many entities are stored)
     */
    size(): number {
        return this.entities.size;
    }

    /**
     * Returns the ID part of the Entity
     */
    static id(entity: Entity): number {
        return entity & 0b00000000_00000000_11111111_11111111
    }
    /**
     * Returns the version part of the Entity
     */
    static version(entity: Entity): number {
        return entity & 0b11111111_11111111_00000000_00000000
    }

    /**
     * Creates an iterator over entities + their components
     */
    private generateView = function* (
        self: Registry,
        types: Constructor<Component>[]
    ) {
        nextEntity: for (const entity of self.entities.values()) {
            const item: [Entity, ...Component[]] = [entity];

            for (const type of types) {
                const _type = TypeOf(type);
                const list = self.components.get(_type);
                if (!list) continue nextEntity;

                const component = list.get(entity);
                if (!component) continue nextEntity;

                item.push(component);
            }

            yield item;
        }
    }
}