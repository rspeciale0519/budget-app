import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prismaAdmin } from "@/lib/prisma-admin";
import { GET } from "@/app/api/v1/workspaces/route";

const serviceUser = randomUUID();
let orgId: string;
let businessWs: string;
let personalWs: string;

beforeAll(async () => {
  const org = await prismaAdmin.organization.create({ data: { name: "API Org" } });
  orgId = org.id;
  await prismaAdmin.orgMembership.create({ data: { organizationId: orgId, userId: serviceUser, role: "member" } });
  const biz = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "Biz", type: "business", color: "#abcabc" } });
  const personal = await prismaAdmin.workspace.create({ data: { organizationId: orgId, name: "Personal", type: "personal", color: "#defdef" } });
  businessWs = biz.id;
  personalWs = personal.id;
  // The service user is scoped to the Business workspace only.
  await prismaAdmin.workspaceMembership.create({ data: { workspaceId: businessWs, userId: serviceUser, role: "viewer" } });

  process.env.API_SERVICE_TOKEN = "test-token";
  process.env.API_SERVICE_USER_ID = serviceUser;
});

afterAll(async () => {
  await prismaAdmin.organization.delete({ where: { id: orgId } });
  await prismaAdmin.$disconnect();
  delete process.env.API_SERVICE_TOKEN;
  delete process.env.API_SERVICE_USER_ID;
});

describe("GET /api/v1/workspaces", () => {
  it("returns 401 without auth", async () => {
    const res = await GET(new Request("http://localhost/api/v1/workspaces"));
    expect(res.status).toBe(401);
  });

  it("returns only the service token's scoped workspaces (not Personal)", async () => {
    const res = await GET(
      new Request("http://localhost/api/v1/workspaces", {
        headers: { authorization: "Bearer test-token" },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { workspaces: { id: string }[] };
    const ids = body.workspaces.map((w) => w.id);
    expect(ids).toContain(businessWs);
    expect(ids).not.toContain(personalWs);
  });

  it("rejects an invalid token", async () => {
    const res = await GET(
      new Request("http://localhost/api/v1/workspaces", {
        headers: { authorization: "Bearer wrong" },
      }),
    );
    expect(res.status).toBe(401);
  });
});
