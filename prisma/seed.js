const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");
const saltRounds = 10;

const permissions = [
  "createProduct",
  "viewProduct",
  "updateProduct",
  "deleteProduct",
  "createCustomer",
  "viewCustomer",
  "updateCustomer",
  "deleteCustomer",
  "createSupplier",
  "viewSupplier",
  "updateSupplier",
  "deleteSupplier",
  "createTransaction",
  "viewTransaction",
  "updateTransaction",
  "deleteTransaction",
  "createSaleInvoice",
  "viewSaleInvoice",
  "updateSaleInvoice",
  "deleteSaleInvoice",
  "createPurchaseInvoice",
  "viewPurchaseInvoice",
  "updatePurchaseInvoice",
  "deletePurchaseInvoice",
  "createPaymentPurchaseInvoice",
  "viewPaymentPurchaseInvoice",
  "updatePaymentPurchaseInvoice",
  "deletePaymentPurchaseInvoice",
  "createPaymentSaleInvoice",
  "viewPaymentSaleInvoice",
  "updatePaymentSaleInvoice",
  "deletePaymentSaleInvoice",
  "createRole",
  "viewRole",
  "updateRole",
  "deleteRole",
  "createRolePermission",
  "viewRolePermission",
  "updateRolePermission",
  "deleteRolePermission",
  "createUser",
  "viewUser",
  "updateUser",
  "deleteUser",
  "viewDashboard",
  "viewPermission",
  "createDesignation",
  "viewDesignation",
  "updateDesignation",
  "deleteDesignation",
  "createProductCategory",
  "viewProductCategory",
  "updateProductCategory",
  "deleteProductCategory",
  "createReturnPurchaseInvoice",
  "viewReturnPurchaseInvoice",
  "updateReturnPurchaseInvoice",
  "deleteReturnPurchaseInvoice",
  "createReturnSaleInvoice",
  "viewReturnSaleInvoice",
  "updateReturnSaleInvoice",
  "deleteReturnSaleInvoice",
  "updateSetting",
  "viewSetting",
];

const roles = ["admin", "staff"];

const accounts = [
  { name: "Asset", type: "Asset" },
  { name: "Liability", type: "Liability" },
  { name: "Capital", type: "Owner's Equity" },
  { name: "Withdrawal", type: "Owner's Equity" },
  { name: "Revenue", type: "Owner's Equity" },
  { name: "Expense", type: "Owner's Equity" },
];

const subAccounts = [
  { account_id: 1, name: "Cash" }, //1
  { account_id: 1, name: "Bank" }, //2
  { account_id: 1, name: "Inventory" }, //3
  { account_id: 1, name: "Accounts Receivable" }, //4
  { account_id: 2, name: "Accounts Payable" }, //5
  { account_id: 3, name: "Capital" }, //6
  { account_id: 4, name: "Withdrawal" }, //7
  { account_id: 5, name: "Sales" }, //8
  { account_id: 6, name: "Cost of Sales" }, //9
  { account_id: 6, name: "Salary" }, //10
  { account_id: 6, name: "Rent" }, //11
  { account_id: 6, name: "Utilities" }, //12
  { account_id: 5, name: "Discount Earned" }, //13
  { account_id: 6, name: "Discount Given" }, //14
];

const settings = {
  company_name: "My Company",
  address: "My Address",
  phone: "My Phone",
  email: "My Email",
  website: "My Website",
  footer: "My Footer",
  tag_line: "My Tag Line",
};

async function main() {
  const adminHash = await bcrypt.hash("admin", saltRounds);
  const staffHash = await bcrypt.hash("staff", saltRounds);

  await prisma.user.create({
    data: {
      username: "admin",
      password: adminHash,
      role: "admin",
      email: "admin@admin.com",
      id_no: "admin_id_no",
      phone: "123"
    },
  });

  await prisma.user.create({
    data: {
      username: "staff",
      password: staffHash,
      role: "staff",
      email: "staff@staff.com",
      id_no: "staff_id_no",
      phone: "456"
    },
  });

  const adminRole = await prisma.role.create({
    data: {
      name: roles[0]
    }
  });

  await prisma.role.create({
    data: {
      name: roles[1]
    }
  })

  for (let i = 0; i < permissions.length; i++) {
    const permission = await prisma.permission.create({
      data: {
        name: permissions[i]
      }
    });

    await prisma.rolePermission.create({
      data: {
        role_id: adminRole.id,
        permission_id: permission.id
      },
    });
  }

  for (let i = 0; i < accounts.length; i++) {
    const account = await prisma.account.create({
      data: {
        name: accounts[i].name,
        type: accounts[i].type
      }
    });

    for (let j = 0; j < subAccounts.length; j++) {
      if (subAccounts[j].account_id === (i + 1)) {
        await prisma.subAccount.create({
          data: {
            account_id: account.id,
            name: subAccounts[j].name
          }
        })
      }
    }
  }

  await prisma.appSetting.create({
    data: settings,
  });
}

main()
  .then(async () => {
    console.log('dd')
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
