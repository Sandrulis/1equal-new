import { createLegalPage } from "@/app/lib/legal-page";

const page = createLegalPage("terms");

export const generateMetadata = page.generateMetadata;
export default page.Page;
