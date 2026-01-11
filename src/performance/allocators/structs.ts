import { FreeList_Heap } from "./free_list";

// Allowed primitive types
type PrimitiveType = 'u8' | 'i8' | 'u16' | 'i16' | 'u32' | 'i32' | 'u64' | 'i64' | 'f32' | 'f64';
type StructType = PrimitiveType | `${PrimitiveType}[${number}]`;

// Field descriptor
interface StructField {
    type: StructType;        // 'u32' or 'i32[5]'
    offset: number;          // byte offset in struct
    size: number;            // total bytes
    arrayLength?: number;    // for arrays
}

// Struct definition
export interface StructDefinition {
    _size: number;                              // total struct size
    _fields: Record<string, StructField>;
    fieldOrder: string[];
    Make: (heap: Heap, initial?: Record<string, number | Iterable<number>>, region?: Uint8Array & { ptr: number }) => LiveStruct;
}

// Live struct proxy
export interface LiveStruct {
    ptr: number;
    region: Uint8Array & { ptr: number };
    _type: StructDefinition;
    read(field: string): number | Uint8Array | Int8Array | Uint16Array | Int16Array | Uint32Array | Int32Array | Float32Array | Float64Array;
    write(field: string, value: number | Iterable<number>): void;
    free(): void;
    [key: string]: any;
}

type Heap = FreeList_Heap;
// === Helpers ===
function primitiveSize(type: PrimitiveType) {
    switch (type) {
        case 'u8': case 'i8': return 1;
        case 'u16': case 'i16': return 2;
        case 'u32': case 'i32': case 'f32': return 4;
        case 'u64': case 'i64': case 'f64': return 8;
    }
}

// Make a typed view over an existing region
function typedArrayFor(base: PrimitiveType, region: Uint8Array, offset: number, length: number) {
    const buffer = region.buffer;
    const byteOffset = region.byteOffset + offset;
    switch (base) {
        case 'u8': return new Uint8Array(buffer, byteOffset, length);
        case 'i8': return new Int8Array(buffer, byteOffset, length);
        case 'u16': return new Uint16Array(buffer, byteOffset, length);
        case 'i16': return new Int16Array(buffer, byteOffset, length);
        case 'u32': return new Uint32Array(buffer, byteOffset, length);
        case 'i32': return new Int32Array(buffer, byteOffset, length);
        case 'f32': return new Float32Array(buffer, byteOffset, length);
        case 'f64': return new Float64Array(buffer, byteOffset, length);
        default: throw new Error(`Unsupported type ${base}`);
    }
}

// === Main struct factory ===
export function struct(fields: Record<string, StructType>): StructDefinition {
    let offset = 0;
    const layout: Record<string, StructField> = {};
    const fieldOrder: string[] = [];

    for (const [name, typeStr] of Object.entries(fields)) {
        let baseType: PrimitiveType;
        let arrayLength = 1;

        const arrMatch = typeStr.match(/^([a-z0-9]+)\[(\d+)\]$/i);
        if (arrMatch) {
            baseType = arrMatch[1] as PrimitiveType;
            arrayLength = parseInt(arrMatch[2], 10);
        } else {
            baseType = typeStr as PrimitiveType;
        }

        const size = primitiveSize(baseType) * arrayLength;
        layout[name] = { type: typeStr, offset, size, arrayLength: arrayLength > 1 ? arrayLength : undefined };
        fieldOrder.push(name);
        offset += size;
    }

    const structDef: StructDefinition = {
        _size: offset,
        _fields: layout,
        fieldOrder,

        Make(heap: Heap, initial?: Record<string, number | Iterable<number>>, region?: Uint8Array & { ptr: number }): LiveStruct {
            const reg = region ?? heap.malloc(structDef._size);
            const ptr = reg.ptr;
            let freed = false;

            const live: LiveStruct = new Proxy({
                ptr,
                region: reg,
                _type: structDef,

                read(field: string) {
                    if (freed) throw new Error("Accessing freed struct");
                    const info = layout[field];
                    if (!info) throw new Error("Invalid field " + field);
                    if (info.arrayLength) {
                        const baseType = info.type.replace(/\[\d+\]$/, '') as PrimitiveType;
                        return typedArrayFor(baseType, reg, info.offset, info.arrayLength);
                    } else {
                        const baseType = info.type as PrimitiveType;
                        return typedArrayFor(baseType, reg, info.offset, 1)[0];
                    }
                },

                write(field: string, value: number | Iterable<number>) {
                    if (freed) throw new Error("Writing to freed struct");
                    const info = layout[field];
                    if (!info) throw new Error("Invalid field " + field);

                    if (info.arrayLength) {
                        const baseType = info.type.replace(/\[\d+\]$/, '') as PrimitiveType;
                        const arr: number[] = Array.isArray(value) ? value : Array.from(value as Iterable<number>);
                        if (arr.length !== info.arrayLength) throw new Error(`Field ${field} expects array of length ${info.arrayLength}`);
                        for (let i = 0; i < info.arrayLength; i++) {
                            const typed = typedArrayFor(baseType, reg, info.offset + i * primitiveSize(baseType), 1);
                            typed[0] = arr[i];
                        }
                    } else {
                        const typed = typedArrayFor(info.type as PrimitiveType, reg, info.offset, 1);
                        typed[0] = value as number;
                    }
                },

                free() {
                    if (!freed) {
                        heap.free(reg);
                        freed = true;
                    } else {
                        throw new Error("Struct already freed");
                    }
                }
            }, {
                get(target, prop) {
                    if (prop in target) return (target as any)[prop];
                    return target.read(prop.toString());
                },
                set(target, prop, value) {
                    target.write(prop.toString(), value);
                    return true;
                }
            });

            // initialize
            if (initial) {
                for (const [k, v] of Object.entries(initial)) {
                    live.write(k, v);
                }
            }

            return live;
        }
    };

    return structDef;
}
