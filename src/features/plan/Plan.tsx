import { useEffect, useRef, useState } from "react";
import { Dialog, Title } from "../../components";
import { download } from "../../domain";
import { mountPlan, type Planner } from "./runtime.js";
import { PlanDetail } from "./PlanDetail";
import "./plan.css";
import "./detail.css";

export default function Plan() {
  const host = useRef<HTMLDivElement>(null);
  const planner = useRef<Planner | null>(null);
  const opener = useRef("");
  const [trail, setTrail] = useState<string[]>([]);
  const [, refresh] = useState(0);
  const active = trail.at(-1);
  const close = () => {
    setTrail([]);
    requestAnimationFrame(() => planner.current?.focusCard(opener.current));
  };
  useEffect(() => {
    if (host.current) {
      const controller = mountPlan(
        host.current,
        (name, text, type = "text/plain;charset=utf-8") =>
          download(name, text, type),
        (id) => {
          opener.current = id;
          setTrail([id]);
        },
        () => refresh((value) => value + 1),
      );
      planner.current = controller;
      return () => {
        controller.destroy();
        planner.current = null;
      };
    }
  }, []);
  return (
    <>
      <Title
        title="Project plan"
        sub="The complete team roadmap — from first increment to final review."
      />
      <div className="plan-page" ref={host} />
      {active && planner.current && (
        <Dialog variant="plan" title={`${active} · Card detail`} close={close}>
          <PlanDetail
            key={active}
            id={active}
            planner={planner.current}
            open={(id) => setTrail((previous) => [...previous, id])}
            back={
              trail.length > 1
                ? () => setTrail((previous) => previous.slice(0, -1))
                : undefined
            }
          />
        </Dialog>
      )}
    </>
  );
}
