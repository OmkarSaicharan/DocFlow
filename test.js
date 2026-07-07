import { PrismaClient } from "@prisma/client";

async function runTest() {
  console.log("Starting database integration test...");
  const prisma = new PrismaClient();

  try {
    const testTitle = `Test Document ${Date.now()}`;
    const testContent = "<h1>Test Content</h1><p>This is a test document created by the automated test suite.</p>";
    const testOwner = "test@example.com";

    console.log("Creating document...");
    const created = await prisma.document.create({
      data: {
        title: testTitle,
        content: testContent,
        ownerEmail: testOwner,
      },
    });

    console.log("Document created with ID:", created.id);
    if (created.title !== testTitle) {
      throw new Error(`Expected title "${testTitle}" but got "${created.title}"`);
    }
    if (created.content !== testContent) {
      throw new Error("Content mismatch");
    }

    console.log("Verifying document retrieval...");
    const retrieved = await prisma.document.findUnique({
      where: { id: created.id },
    });

    if (!retrieved) {
      throw new Error("Document not found in database after creation");
    }
    console.log("Document successfully retrieved!");

    console.log("Cleaning up test document...");
    await prisma.document.delete({
      where: { id: created.id },
    });

    console.log("Database connection & Prisma integration test PASSED! 🎉");
    process.exit(0);
  } catch (error) {
    console.error("Test FAILED with error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
