import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const task1 = await prisma.task.create({
    data: {
      name: "Scrape Example Products",
      type: "SCRAPE",
      description: "Extract product names and prices from example.com",
      status: "COMPLETED",
      config: { url: "https://example.com/products", selectors: { container: ".product", fields: { name: ".name", price: ".price" } } },
    },
  });

  await prisma.taskResult.create({
    data: {
      taskId: task1.id,
      status: "SUCCESS",
      data: [{ name: "Widget A", price: "$29.99" }, { name: "Widget B", price: "$39.99" }],
      duration: 2500,
    },
  });

  const task2 = await prisma.task.create({
    data: {
      name: "Screenshot Homepage",
      type: "SCREENSHOT",
      description: "Capture full page screenshot of example.com",
      status: "COMPLETED",
      config: { url: "https://example.com" },
    },
  });

  await prisma.taskResult.create({
    data: {
      taskId: task2.id,
      status: "SUCCESS",
      data: { filename: "example-homepage.png" },
      duration: 1800,
    },
  });

  const task3 = await prisma.task.create({
    data: {
      name: "Contact Form Fill",
      type: "FORM_FILL",
      description: "Fill out contact form with test data",
      status: "PENDING",
      config: { url: "https://example.com/contact", fields: { name: "John Doe", email: "john@example.com" } },
    },
  });

  console.log(`Created ${3} seed tasks`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
