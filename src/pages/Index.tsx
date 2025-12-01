import { FileExplorer } from "@/components/FileExplorer";
import { AuthWrapper } from "@/components/AuthWrapper";
import logger from "@/lib/logger";

const Index = () => {
  logger.info("Index page rendered");
  return (
    <AuthWrapper>
      <div className="flex h-screen bg-background select-none">
        <div className="flex-1 flex flex-col overflow-hidden">
          <FileExplorer />
        </div>
      </div>
    </AuthWrapper>
  );
};

export default Index;