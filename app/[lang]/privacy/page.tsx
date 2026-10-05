import { createLegalPage } from "@/app/lib/legal-page";

const page = createLegalPage("privacy");

export const generateMetadata = page.generateMetadata;
export default page.Page;
