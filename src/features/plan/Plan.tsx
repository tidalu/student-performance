import { useEffect, useRef } from "react";
import { Title } from "../../components";
import { download } from "../../domain";
import { mountPlan } from "./runtime.js";
import "./plan.css";

export default function Plan() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (host.current)
      return mountPlan(
        host.current,
        (name, text, type = "text/plain;charset=utf-8") =>
          download(name, text, type),
      );
  }, []);
  return (
    <>
      <Title
        title="Project plan"
        sub="The complete team roadmap — from first increment to final review."
      />
      <div className="plan-page" ref={host} />
    </>
  );
}
