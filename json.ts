// import { D } from "@panth977/data";
// import {
//   OizomDatapoint,
//   type CT,
//   type DT,
//   type Modal,
//   type RT,
// } from "./factory.ts";

// class JsonModal implements Modal {
//   constructor(
//     private data: [number, { [K in keyof CT]: Record<CT[K], DT[K]> }][],
//   ) {
//     //
//   }

//   expandCol<K extends keyof CT>(
//     topic: K,
//     add: number,
//     useEmpty?: boolean,
//   ): void {
//     // ignore
//   }
//   shrinkCol<K extends keyof CT>(topic: K, remove: number): void {
//     // ignore
//   }
//   rows(type: "[row,rIdx]"): IterableIterator<[RT, number]>;
//   rows(type: "row"): IterableIterator<RT>;
//   rows(type: "rIdx"): IterableIterator<number>;
//   rows(type: string): IterableIterator<any> {
//     for (let index = 0; index < array.length; index++) {
//         const element = array[index];
        
//     }
//   }
//   cols<K extends keyof CT>(
//     topic: K,
//     type: "[col,cIdx]",
//   ): IterableIterator<[CT[K], [K, number]]>;
//   cols<K extends keyof CT>(topic: K, type: "col"): IterableIterator<CT[K]>;
//   cols<K extends keyof CT>(
//     topic: K,
//     type: "cIdx",
//   ): IterableIterator<[K, number]>;
//   cols<K extends keyof CT>(topic: string, type: string): IterableIterator<any> {
//     //
//   }
//   getRIdx(row: RT, addIfNot?: false): number | undefined;
//   getRIdx(row: RT, addIfNot: true): number;
//   getRIdx(row: RT, addIfNot?: boolean): number | undefined {
//     //
//   }
//   getCIdx<K extends keyof CT>(
//     topic: K,
//     col: CT[K],
//     addIfNot?: false,
//   ): [K, number] | undefined;
//   getCIdx<K extends keyof CT>(
//     topic: K,
//     col: CT[K],
//     addIfNot: true,
//   ): [K, number];
//   getCIdx<K extends keyof CT>(
//     topic: string,
//     col: string,
//     addIfNot?: boolean,
//   ): [K, number] | undefined {
//     //
//   }

//   removeRow(row: RT): void {
//     //
//   }
//   removeCol<K extends keyof CT>(topic: K, col: CT[K]): void {
//     //
//   }
//   get<K extends keyof CT>(rIdx: number, cIdx: [K, number]): DT[K] | undefined {
//     //
//   }
//   set<K extends keyof CT>(rIdx: number, cIdx: [K, number], val: DT[K]): void {
//     //
//   }
//   del<K extends keyof CT>(rIdx: number, cIdx: [K, number]): void {
//     //
//   }
//   mapCol<K extends keyof CT, M>(
//     topic: K,
//     col: CT[K],
//     map: (row: RT, val: DT[K] | undefined) => M,
//   ): M[] {
//     //
//   }
//   usedOfRow(): number {
//     //
//   }
//   capacityOfRow(): number {
//     //
//   }
//   getRowAt(rIdx: number): RT | undefined {
//     //
//   }
//   usedOfCol<K extends keyof CT>(topic: K): number {
//     //
//   }
//   capacityOfCol<K extends keyof CT>(topic: K): number {
//     //
//   }
//   getColAt<K extends keyof CT>(cIdx: [K, number]): CT[K] | undefined {
//     //
//   }

//   copy(): JsonModal {
//     //
//   }
//   filter(
//     predicate: ((row: number, rIdx: number) => boolean) | [number, number][],
//   ): JsonModal {
//     //
//   }
// }
// export class JsonOizomDatapoints extends OizomDatapoint {
//   constructor(
//     deviceId: string,
//     deviceType: string,
//     private modal: JsonModal,
//   ) {
//     super(deviceId, deviceType, modal as Modal);
//   }
//   override copy(): JsonOizomDatapoints {
//     return new JsonOizomDatapoints(
//       this.deviceId,
//       this.deviceType,
//       this.modal.copy(),
//     );
//   }
//   override filter(
//     predicate: ((row: number, rIdx: number) => boolean) | [number, number][],
//   ): JsonOizomDatapoints {
//     return new JsonOizomDatapoints(
//       this.deviceId,
//       this.deviceType,
//       this.modal.filter(predicate),
//     );
//   }
// }
