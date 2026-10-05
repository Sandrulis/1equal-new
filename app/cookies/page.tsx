import { createRootLegalPage } from "@/app/lib/legal-page";

const page = createRootLegalPage("cookies");

export const revalidate = 3600;
export const generateMetadata = page.generateMetadata;
export default page.Page;
