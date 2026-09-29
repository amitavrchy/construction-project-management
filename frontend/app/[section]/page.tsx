import { Suspense } from "react";
import { Workspace } from "../../components/workspace";
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="initial-loading">
          <span className="loader" />
          Loading workspace?
        </div>
      }
    >
      <Workspace />
    </Suspense>
  );
}
