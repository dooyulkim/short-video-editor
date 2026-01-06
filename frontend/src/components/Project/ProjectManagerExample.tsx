// Example of integrating ProjectManager into the main App

import { ProjectManager } from "@/components/Project/ProjectManager";
import { TimelineProvider } from "@/context/TimelineContext";

function App() {
  return (
    <TimelineProvider>
      <div className="flex flex-col h-screen">
        {/* Top Toolbar */}
        <div className="border-b p-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Short Video Editor</h1>
            {/* Project Manager Component */}
            <ProjectManager />
          </div>
        </div>

        {/* Rest of the application */}
        <div className="flex-1 flex">
          {/* Resource Panel, Timeline, Player, etc. */}
        </div>
      </div>
    </TimelineProvider>
  );
}

export default App;
