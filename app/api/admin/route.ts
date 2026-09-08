import { getAdminOverview } from "@/lib/admin/overview";
import { failure, json } from "@/lib/http";

export async function GET() {
  try { return json(await getAdminOverview()); } catch (error) { return failure(error); }
}
