import { D } from "@panth977/data";
import { OizomDatapoint } from "./factory.ts";

type Modal = D.RelativeEpochAxis<{
  data: D.KeyAxis<D.FloatDataArray>;
  meta: D.KeyAxis<D.StrDataArray>;
}>;
export class RelativeOizomDatapoints extends OizomDatapoint {
  static parser = D.RelativeEpochAxis.parser({
    data: D.KeyAxis.parser(D.FloatDataArray.parser()),
    meta: D.KeyAxis.parser(D.StrDataArray.parser()),
  });
  static getModal(dp: RelativeOizomDatapoints): Modal {
    return dp.modal;
  }

  constructor(
    deviceId: string,
    deviceType: string,
    private modal: Modal,
  ) {
    super(deviceId, deviceType, modal);
  }
  override copy(): RelativeOizomDatapoints {
    return new RelativeOizomDatapoints(
      this.deviceId,
      this.deviceType,
      this.modal.copy(),
    );
  }
  override filter(
    predicate: ((row: number, rIdx: number) => boolean) | [number, number][],
  ): RelativeOizomDatapoints {
    return new RelativeOizomDatapoints(
      this.deviceId,
      this.deviceType,
      this.modal.filter(RelativeOizomDatapoints.parser, predicate),
    );
  }
}
