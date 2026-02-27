import type { D } from "@panth977/data";
import { PredefinedOizomDatapoints } from "./predefined.ts";
import { RelativeOizomDatapoints } from "./relative.ts";
import { Base64Parser, CompactParser, LegacyParser } from "./parser.ts";

/**
 * Represents a timestamp in milliseconds.
 */
export type RT = number;

/**
 * Configuration for topic column type.
 */
export type CT = { data: string; meta: string };

/**
 * Configuration for topic data type.
 */
export type DT = { data: number; meta: string };

/**
 * Basic identification for an Oizom device.
 */
export type Device = {
  /** Unique identifier of the device. */
  deviceId: string;
  /** The model or category of the device. */
  deviceType: string;
};

/**
 * Legacy data format used for backward compatibility with older Oizom systems.
 */
export type Legacy = {
  deviceId: string;
  deviceType: string;
  payload: {
    /** Epoch in seconds. */
    t: number;
    /** Sensor readings mapping parameter names to concentrations. */
    d: {
      [parameter: string]: number;
      /** Duplicate epoch in seconds for legacy reasons. */
      t: number;
    };
    /** Status or label metadata. */
    s: {
      [label: string]: string;
    };
  };
}[];

/**
 * A compressed, array-based format optimized for transmission.
 */
export type Compact = {
  deviceId: string;
  deviceType: string;
  keys: string[];
  labels: string[];
  /** * Array of tuples: [timestamp_ms, concentrations[], labels[]]
   */
  data: [number, (null | number)[], (null | string)[]][];
};

/**
 * The internal data structure interface based on `@panth977/data`.
 * Handles the multi-dimensional mapping of time series data.
 */
export type Modal = Pick<
  D.EpochAxis<{
    data: D.KeyAxis<D.FloatDataArray>;
    meta: D.KeyAxis<D.StrDataArray>;
  }>,
  | "expandCol"
  | "rows"
  | "cols"
  | "getRIdx"
  | "getCIdx"
  | "get"
  | "set"
  | "del"
  | "usedOfRow"
  | "usedOfCol"
>;

/**
 * Abstract base class for Oizom Datapoints.
 * Provides a unified interface for handling environmental data across different serialization formats.
 * * All time values are stored internally in **milliseconds**.
 */
export abstract class OizomDatapoint
  implements Omit<Modal, "usedOfRow" | "usedOfCol">, Device
{
  /**
   * Initializes a new OizomDatapoint instance.
   * @param deviceId - The unique ID of the device.
   * @param deviceType - The type/model of the device.
   * @param modal - The underlying data modal implementation.
   */
  constructor(
    readonly deviceId: string,
    readonly deviceType: string,
    modal: Modal,
  ) {
    if (typeof deviceId !== "string") throw new Error("DeviceId not a string");
    if (typeof deviceType !== "string")
      throw new Error("DeviceType not a string");

    // Binding methods to maintain context during destructuring or external calls
    this.expandCol = modal.expandCol.bind(modal) as never;
    this.rows = modal.rows.bind(modal) as never;
    this.cols = modal.cols.bind(modal) as never;
    this.getRIdx = modal.getRIdx.bind(modal) as never;
    this.getCIdx = modal.getCIdx.bind(modal) as never;
    this.get = modal.get.bind(modal) as never;
    this.set = modal.set.bind(modal) as never;
    this.del = modal.del.bind(modal) as never;
    this.usedOfRow = modal.usedOfRow.bind(modal) as never;
    this.usedOfCol = modal.usedOfCol.bind(modal) as never;
  }

  /** * Increases the column capacity for a specific topic.
   * @param topic - The category (data or meta).
   * @param count - Number of columns to add.
   */
  expandCol: Modal["expandCol"];

  /** * Returns the total number of rows (timestamps) currently in the modal.
   */
  rows: Modal["rows"];

  /** * Returns the total number of columns for a specific topic.
   * @param topic - The category (data or meta).
   */
  cols: Modal["cols"];

  /** * Gets the row index for a specific timestamp.
   * @param val - The timestamp in milliseconds.
   * @param create - If true, creates the row if it doesn't exist.
   */
  getRIdx: Modal["getRIdx"];

  /** * Gets the column index for a specific key/parameter.
   * @param topic - The category (data or meta).
   * @param key - The parameter name (e.g., "pm25").
   * @param create - If true, creates the column if it doesn't exist.
   */
  getCIdx: Modal["getCIdx"];

  /** * Retrieves a value from the data grid.
   * @param topic - The category (data or meta).
   * @param rIdx - The row index.
   * @param cIdx - The column index.
   */
  get: Modal["get"];

  /** * Sets a value in the data grid.
   * @param topic - The category (data or meta).
   * @param rIdx - The row index.
   * @param cIdx - The column index.
   * @param val - The value to store (number for data, string for meta).
   */
  set: Modal["set"];

  /** * Deletes a value at the specified coordinates.
   */
  del: Modal["del"];

  private usedOfRow: Modal["usedOfRow"];
  private usedOfCol: Modal["usedOfCol"];

  isEmpty(): boolean {
    return (
      this.usedOfRow() === 0 ||
      (this.usedOfCol("data") === 0 && this.usedOfCol("meta") === 0)
    );
  }
  isNotEmpty(): boolean {
    return (
      this.usedOfRow() !== 0 &&
      (this.usedOfCol("data") !== 0 || this.usedOfCol("meta") !== 0)
    );
  }

  /**
   * Creates a deep copy of the current datapoint.
   */
  abstract copy(): OizomDatapoint;

  /**
   * Filters the datapoints based on a predicate or a specific list of indices.
   * @param predicate - A function returning true for rows to keep, or an array of [time, index] pairs.
   */
  abstract filter(
    predicate: ((row: RT, rIdx: number) => boolean) | [RT, number][],
  ): OizomDatapoint;

  /**
   * Serializes the current object to a Base64 string.
   */
  toBase64(): string {
    return new Base64Parser().to(this);
  }

  /**
   * Converts the current object to the Legacy data format.
   */
  toLegacy(): Legacy {
    return new LegacyParser().to(this);
  }

  /**
   * Converts the current object to the Compact array format.
   */
  toCompact(): Compact {
    return new CompactParser().to(this);
  }

  /**
   * Deserializes a Base64 string into an OizomDatapoint.
   */
  static fromBase64(val: string): OizomDatapoint {
    return new Base64Parser().from(val);
  }

  /**
   * Deserializes Legacy format data into an OizomDatapoint.
   */
  static fromLegacy(data: Legacy): OizomDatapoint {
    return new LegacyParser().from(data);
  }

  /**
   * Deserializes Compact format data into an OizomDatapoint.
   */
  static fromCompact(payload: Compact): OizomDatapoint {
    return new CompactParser().from(payload);
  }

  /**
   * Creates a datapoint instance optimized for periodic data (fixed intervals).
   * @param device - Device metadata.
   * @param range - Time range and gap between points.
   * @param size - Number of columns or specific column keys for data/meta.
   */
  static createPeriodic(
    device: Device,
    range: { gteInMs: number; lteInMs: number; gapInMs: number },
    size: { [K in keyof CT]: number | string[] },
  ): OizomDatapoint {
    const modal = PredefinedOizomDatapoints.parser.create();
    modal.optimize({
      gap: range.gapInMs,
      gte: range.gteInMs,
      lte: range.lteInMs,
    });
    for (const topic in size) {
      const s = size[topic as keyof CT];
      if (typeof s === "number") {
        modal.expandCol(topic as keyof CT, s);
      } else {
        modal.expandCol(topic as keyof CT, s.length);
        for (const c of s) {
          modal.getCIdx(topic as keyof CT, c, true);
        }
      }
    }
    return new PredefinedOizomDatapoints(
      device.deviceId,
      device.deviceType,
      modal,
    );
  }

  /**
   * Creates a datapoint instance for irregular data over a specific range.
   * @param device - Device metadata.
   * @param range - Time range and expected count of points.
   * @param size - Number of columns or specific column keys.
   */
  static createUnPeriodic(
    device: Device,
    range: { gteInMs: number; lteInMs: number; count: number },
    size: { [K in keyof CT]: number | string[] },
  ): OizomDatapoint {
    const modal = RelativeOizomDatapoints.parser.create();
    modal.optimize({
      gap: Math.ceil((range.lteInMs - range.gteInMs) / range.count),
      gte: range.gteInMs,
      lte: range.lteInMs,
    });
    for (const topic in size) {
      const s = size[topic as keyof CT];
      if (typeof s === "number") {
        modal.expandCol(topic as keyof CT, s);
      } else {
        modal.expandCol(topic as keyof CT, s.length);
        for (const c of s) {
          modal.getCIdx(topic as keyof CT, c, true);
        }
      }
    }
    return new RelativeOizomDatapoints(
      device.deviceId,
      device.deviceType,
      modal,
    );
  }

  /**
   * Creates a datapoint instance containing a single measurement point.
   */
  static single(
    device: Device,
    size: { [K in keyof CT]: number | string[] },
  ): OizomDatapoint {
    const modal = RelativeOizomDatapoints.parser.create();
    for (const topic in size) {
      const s = size[topic as keyof CT];
      if (typeof s === "number") {
        modal.expandCol(topic as keyof CT, s);
      } else {
        modal.expandCol(topic as keyof CT, s.length);
        for (const c of s) {
          modal.getCIdx(topic as keyof CT, c, true);
        }
      }
    }
    return new RelativeOizomDatapoints(
      device.deviceId,
      device.deviceType,
      modal,
    );
  }

  /**
   * Creates an empty OizomDatapoint instance.
   */
  static empty(device: Device): OizomDatapoint {
    return new RelativeOizomDatapoints(
      device.deviceId,
      device.deviceType,
      RelativeOizomDatapoints.parser.create(),
    );
  }

  /**
   * Calculates the Highest Common Factor (Greatest Common Divisor) for a set of numbers.
   */
  static HCF(...numbers: number[]): number {
    if (!numbers.length) return 0;
    let a = numbers[0];
    let i = 1;
    while (i < numbers.length) {
      let b = numbers[i];
      while (b) {
        [a, b] = [b, a % b];
      }
      i++;
    }
    return a;
  }

  /**
   * Checks if the timestamps are strictly in ascending order.
   * @returns "YES" for Predefined, "UNKNOWN" for Relative types.
   */
  isTimeInAsc(): "YES" | "UNKNOWN" {
    if (this instanceof PredefinedOizomDatapoints) return "YES";
    if (this instanceof RelativeOizomDatapoints) return "UNKNOWN";
    throw new Error("Unknown type found");
  }
}
