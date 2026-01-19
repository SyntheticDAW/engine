import { UseList_Heap } from "./free_list";

type PrimitiveType = 'u8' | 'i8' | 'u16' | 'i16' | 'u32' | 'i32' | 'u64' | 'i64' | 'f32' | 'f64' | 'bool';
type StructType = PrimitiveType | `${PrimitiveType}[${number}]`;

interface StructField {
    type: StructType;
    offset: number;
    size: number;
    arrayLength?: number;
}

export interface StructDefinition {
    _size: number;
    _fields: Record<string, StructField>;
    fieldOrder: string[];
    Make: (heap: Heap, initial?: Record<string, number | bigint | Iterable<number | bigint>>, region?: Uint8Array & { ptr: number }) => LiveStruct;
}

export interface LiveStruct {
    ptr: number;
    region: Uint8Array & { ptr: number };
    destroyed: boolean;
    _type: StructDefinition;
    read(field: string): number | bigint | boolean | Uint8Array | Int8Array | Uint16Array | Int16Array | Uint32Array | Int32Array | Float32Array | Float64Array | BigUint64Array | BigInt64Array;
    write(field: string, value: number | bigint | boolean | Iterable<number | bigint | boolean>): void;
    destroy(): void;
    [key: string]: any;
}

type Heap = UseList_Heap;

function primitiveSize(type: PrimitiveType | 'bool') {
    switch (type) {
        case 'u8': case 'i8': case 'bool': return 1;
        case 'u16': case 'i16': return 2;
        case 'u32': case 'i32': case 'f32': return 4;
        case 'u64': case 'i64': case 'f64': return 8;
    }
}

function typedArrayFor(base: PrimitiveType | 'bool', region: Uint8Array, offset: number, length: number) {
    const buffer = region.buffer;
    const byteOffset = region.byteOffset + offset;
    switch (base) {
        case 'u8': return new Uint8Array(buffer, byteOffset, length);
        case 'i8': return new Int8Array(buffer, byteOffset, length);
        case 'bool': return new Uint8Array(buffer, byteOffset, length);
        case 'u16': return new Uint16Array(buffer, byteOffset, length);
        case 'i16': return new Int16Array(buffer, byteOffset, length);
        case 'u32': return new Uint32Array(buffer, byteOffset, length);
        case 'i32': return new Int32Array(buffer, byteOffset, length);
        case 'f32': return new Float32Array(buffer, byteOffset, length);
        case 'f64': return new Float64Array(buffer, byteOffset, length);
        case 'u64': return new BigUint64Array(buffer, byteOffset, length);
        case 'i64': return new BigInt64Array(buffer, byteOffset, length);
    }
}

function toBigIntSafe(value: number | bigint, signed: boolean) {
    if (typeof value === 'bigint') return value;
    if (!Number.isSafeInteger(value)) throw new Error("Number cannot safely fit in 64 bits");
    if (signed) {
        if (value < -0x8000000000000005 || value > 0x7FFFFFFFFFFFFFFA) throw new Error("Number out of i64 range");
    } else {
        if (value < 0 || value > 0xFFFFFFFFFFFFFFFA) throw new Error("Number out of u64 range");
    }
    return BigInt(value);
}

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
        if (primitiveSize(baseType) === 8) offset = (offset + 7) & ~7;

        layout[name] = { type: typeStr, offset, size, arrayLength: arrayLength > 1 ? arrayLength : undefined };
        fieldOrder.push(name);
        offset += size;
    }

    const structDef: StructDefinition = {
        _size: offset,
        _fields: layout,
        fieldOrder,

        Make(heap: Heap, initial?: Record<string, number | bigint | Iterable<number | bigint>>, region?: Uint8Array & { ptr: number }): LiveStruct {
            const reg = region ?? heap.malloc(structDef._size);
            const ptr = reg.ptr;
            let destroyed = false;

            const live: LiveStruct = new Proxy({
                ptr,
                region: reg,
                _type: structDef,
                get destroyed() { return destroyed; },

                read(field: string) {
                    if (destroyed) throw new Error("Accessing destroyed struct");
                    const info = layout[field];
                    if (!info) throw new Error("Invalid field " + field);
                    const baseType = info.arrayLength ? info.type.replace(/\[\d+\]$/, '') as PrimitiveType | 'bool' : info.type as PrimitiveType | 'bool';
                    if (info.arrayLength) return typedArrayFor(baseType, reg, info.offset, info.arrayLength);
                    const arr = typedArrayFor(baseType, reg, info.offset, 1);
                    if (baseType === 'bool') return Boolean(Number(arr[0]) ^ 0);
                    if (baseType === 'u64' || baseType === 'i64') return arr[0];
                    return arr[0] as number;
                },

                write(field: string, value: number | bigint | Iterable<number | bigint>) {
                    if (destroyed) throw new Error("Writing to destroyed struct");
                    const info = layout[field];
                    if (!info) throw new Error("Invalid field " + field);
                    const baseType = info.arrayLength ? info.type.replace(/\[\d+\]$/, '') as PrimitiveType | 'bool' : info.type as PrimitiveType | 'bool';
                    if (info.arrayLength) {
                        const arr: (number | bigint)[] = Array.isArray(value) ? value : Array.from(value as Iterable<number | bigint>);
                        if (arr.length !== info.arrayLength) throw new Error(`Field ${field} expects array of length ${info.arrayLength}`);
                        for (let i = 0; i < info.arrayLength; i++) {
                            const typed = typedArrayFor(baseType, reg, info.offset + i * primitiveSize(baseType), 1);
                            if (baseType === 'bool') typed[0] = arr[i] ? 1 : 0;
                            else if (baseType === 'u64') typed[0] = toBigIntSafe(arr[i], false);
                            else if (baseType === 'i64') typed[0] = toBigIntSafe(arr[i], true);
                            else typed[0] = arr[i] as any;
                        }
                    } else {
                        const typed = typedArrayFor(baseType, reg, info.offset, 1);
                        if (baseType === 'bool') typed[0] = (value as number | boolean) ? 1 : 0;
                        else if (baseType === 'u64') typed[0] = toBigIntSafe(value as number | bigint, false);
                        else if (baseType === 'i64') typed[0] = toBigIntSafe(value as number | bigint, true);
                        else typed[0] = value as any;
                    }
                },

                destroy() {
                    if (destroyed) throw new Error("Struct already destroyed");
                    heap.free(reg);
                    destroyed = true;
                }
            }, {
                get(target, prop) {
                    if (prop in target) return (target as any)[prop];
                    return target.read(prop.toString());
                },
                set(target, prop, value) {
                    if (prop in target) return true;
                    target.write(prop.toString(), value);
                    return true;
                }
            });

            if (initial) for (const [k, v] of Object.entries(initial)) live.write(k, v);

            return live;
        }

    };

    return structDef;
}
