import { FileExplorer } from "@/components/FileExplorer";
import { AuthWrapper } from "@/components/AuthWrapper";
import logger from "@/lib/logger";

const Index = () => {
  logger.info("Index page rendered");
  return (
    <AuthWrapper>
      <FileExplorer />
    </AuthWrapper>
  );
};

export default Index;