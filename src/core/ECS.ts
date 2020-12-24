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

interface TypeList<T> { [key: string]: T };
interface Storage<T> { [key: number]: T };

/**
 * Registry holds all components in arrays
 *
 * Component types must be registered first
 */
export class Registry {
    private entitySequence: Entity = 0 >>> 0;
    private entities: Set<Entity> = new Set;
    private components: TypeList<Storage<Component>> = {};

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
     * Calls `.free()` (if available) on each destroyed component
     * 
     * Example:
     * ```
     *  class A { free() { console.log("A freed"); } }
     *  const registry = new Registry();
     *  const entity = registry.create();
     *  registry.emplace(entity, new A);
     *  registry.destroy(entity); // logs "A freed"
     * ```
     */
    destroy(entity: Entity) {
        this.entities.delete(entity);
        for (const storage of Object.values(this.components)) {
            const component = storage[entity];
            if (component?.free) component.free();
            delete storage[entity];
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
    get<T extends Component>(entity: Entity, component: Constructor<T>): T | undefined {
        const type = TypeOf(component);

        // can't get for "dead" entity
        if (!this.entities.has(entity)) {
            throw new Error(`Cannot get component "${TypeOf(component)}" for dead entity ID ${entity}`);
        }

        const storage = this.components[type];
        if (storage == null) return undefined;
        return storage[entity] as T | undefined;
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
    has<T extends Component>(entity: Entity, component: Constructor<T>): boolean {
        const type = TypeOf(component);
        const storage = this.components[type];
        return storage != null && storage[entity] != null;
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

        const storage = this.components[type];
        if (storage == null) this.components[type] = {};
        this.components[type][entity] = component;
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
    remove<T extends Component>(entity: Entity, component: Constructor<T>): T | undefined {
        const type = TypeOf(component);

        // can't remove for "dead" entity
        if (!this.entities.has(entity)) {
            throw new Error(`Cannot remove component "${TypeOf(component)}" for dead entity ID ${entity}`);
        }

        const storage = this.components[type];
        if (storage == null) return undefined;
        const out = this.components[type][entity] as T | undefined;
        delete this.components[type][entity];
        return out;
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
                const typeName = TypeOf(type);
                const list = self.components[typeName];
                if (!list) continue nextEntity;

                const component = list[entity];
                if (!component) break;

                item.push(component);
            }

            yield item;
        }
    }
}

export type ComponentView<T extends Constructor<Component>[]> = (registry: Registry, callback: (entity: Entity, ...components: InstanceTypeTuple<T>) => void) => void;
export abstract class Preprocessor {
    static generateView<T extends Constructor<Component>[]>(...types: T): ComponentView<T> {
        let variables = "";
        const varNames: string[] = [];
        for (let i = 0; i < types.length; ++i) {
            const typeName = types[i].name;
            const varName = `_mnc${typeName}_${i}__`;
            varNames.push(varName);
            variables +=
                `const ${varName} = registry.components["${typeName}"][entity];
    if (!${varName}) continue nextEntity;
    `;
        }

        return new Function("registry", "CALLBACK", `
    nextEntity: for(const entity of registry.entities.values()) {
    ${variables}
    CALLBACK(entity, ${varNames.join(",")});
    }
    `) as any;
    }
}