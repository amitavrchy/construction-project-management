import { Suspense } from "react";
import { Provider } from "../../components/provider";
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
      <Provider>
        <Workspace />
      </Provider>
    </Suspense>
  );
}
