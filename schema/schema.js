const bcrypt = require("bcrypt");
const saltRounds = 10;

const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;

const { getObjectSignedUrl } = require("../utils/s3");
const { getPagination } = require("../utils/query");
const gqlauthorize = require("../utils/gqlauthorize");

const {
    GraphQLObjectType,
    GraphQLInputObjectType,
    GraphQLSchema,
    GraphQLList,
    GraphQLInt,
    GraphQLFloat,
    GraphQLBoolean,
    GraphQLString,
} = require("graphql");

const { GraphQLDateTime } = require('graphql-iso-date');

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST;

const AggregationType = new GraphQLObjectType({
    name: "Aggregate",
    fields: () => ({
        _count: {
            type: new GraphQLObjectType({
                name: 'count',
                fields: {
                    id: { type: GraphQLInt }
                }
            })
        },
        _sum: {
            type: new GraphQLObjectType({
                name: "Sum",
                fields: () => ({
                    total_amount: { type: GraphQLFloat },
                    discount: { type: GraphQLFloat },
                    due_amount: { type: GraphQLFloat },
                    paid_amount: { type: GraphQLFloat },
                    total_unit_measurement: { type: GraphQLFloat },
                    total_unit_quantity: { type: GraphQLInt },
                    profit: { type: GraphQLFloat },
                    quantity: { type: GraphQLInt },
                    amount: { type: GraphQLFloat }
                })
            })
        },
        totalPurchasePrice: { type: GraphQLFloat },
        totalSalePrice: { type: GraphQLFloat },
        date: { type: GraphQLString }
    })
});

const CategoryType = new GraphQLObjectType({
    name: "Category",
    fields: () => ({
        id: { type: GraphQLString },
        name: { type: GraphQLString },
        createdAt: { type: GraphQLDateTime },
        updatedAt: { type: GraphQLDateTime },
        count: { type: GraphQLInt },
        product: { type: new GraphQLList(ProductType) }
    })
});

const ProductType = new GraphQLObjectType({
    name: "Product",
    fields: () => ({
        id: { type: GraphQLString },
        name: { type: GraphQLString },
        quantity: { type: GraphQLInt },
        purchase_price: { type: GraphQLFloat },
        sale_price: { type: GraphQLFloat },
        imageName: { type: GraphQLString },
        product_category_id: { type: GraphQLString },
        unit_measurement: { type: GraphQLFloat },
        unit_type: { type: GraphQLString },
        sku: { type: GraphQLString },
        reorder_quantity: { type: GraphQLInt },
        status: { type: GraphQLBoolean },
        created_at: { type: GraphQLDateTime },
        updated_at: { type: GraphQLDateTime },
        imageUrl: { type: GraphQLString },
        product_category: {
            type: new GraphQLObjectType({
                name: "category",
                fields: { name: { type: GraphQLString } }
            })
        },
        count: { type: GraphQLInt }
    })
});

const IncomeProductType = new GraphQLInputObjectType({
    name: "IncomeProduct",
    fields: {
        name: { type: GraphQLString },
        imageName: { type: GraphQLString },
        quantity: { type: GraphQLInt },
        purchase_price: { type: GraphQLFloat },
        sale_price: { type: GraphQLFloat },
        product_category_id: { type: GraphQLString },
        unit_measurement: { type: GraphQLFloat },
        unit_type: { type: GraphQLString },
        sku: { type: GraphQLString },
        reorder_quantity: { type: GraphQLInt }
    }
});

const AllProductsType = new GraphQLObjectType({
    name: "AllProducts",
    fields: {
        allProducts: { type: new GraphQLList(ProductType) },
        aggregations: { type: AggregationType }
    }
});

const SaleInvoiceProductType = new GraphQLObjectType({
    name: "SaleInvoiceProduct",
    fields: {
        id: { type: GraphQLString },
        product_id: { type: GraphQLString },
        invoice_id: { type: GraphQLString },
        product_quantity: { type: GraphQLInt },
        product_sale_price: { type: GraphQLFloat },
        created_at: { type: GraphQLDateTime },
        updated_at: { type: GraphQLDateTime },
        product: { type: ProductType }
    }
});

const SaleInvoiceForReturnType = new GraphQLObjectType({
    name: "SaleInvoiceForReturn",
    fields: {
        id: { type: GraphQLString },
        date: { type: GraphQLDateTime },
        total_amount: { type: GraphQLFloat },
        discount: { type: GraphQLFloat },
        paid_amount: { type: GraphQLFloat },
        due_amount: { type: GraphQLFloat },
        profit: { type: GraphQLFloat },
        customer_id: { type: GraphQLString },
        user_id: { type: GraphQLString },
        note: { type: GraphQLString },
        created_at: { type: GraphQLDateTime },
        updated_at: { type: GraphQLDateTime },
    }
});

const ReturnSaleInvoiceType = new GraphQLObjectType({
    name: "ReturnSaleInvoice",
    fields: {
        id: { type: GraphQLString },
        date: { type: GraphQLDateTime },
        total_amount: { type: GraphQLFloat },
        note: { type: GraphQLString },
        saleInvoice_id: { type: GraphQLString },
        status: { type: GraphQLBoolean },
        created_at: { type: GraphQLDateTime },
        updated_at: { type: GraphQLDateTime },
        saleInvoice: { type: SaleInvoiceForReturnType },
        returnSaleInvoiceProduct: { type: new GraphQLList(SaleInvoiceProductType) }
    }
});

const IncomeReturnSaleInvoiceProductType = new GraphQLInputObjectType({
    name: "IncomeReturnSaleInvoiceProduct",
    fields: {
        product_sale_price: { type: GraphQLFloat },
        product_quantity: { type: GraphQLInt },
        product_id: { type: GraphQLString },
        purchase_price: { type: GraphQLFloat },
    }
});

const ReturnSaleInvoiceProductType = new GraphQLObjectType({
    name: "ReturnSaleInvoiceProduct",
    fields: {
        id: { type: GraphQLString },
        product_id: { type: GraphQLString },
        invoice_id: { type: GraphQLString },
        product_quantity: { type: GraphQLInt },
        product_sale_price: { type: GraphQLFloat },
        created_at: { type: GraphQLString },
        updated_at: { type: GraphQLString },
        product: { type: ProductType }
    }
});

const DetailedSingleReturnSaleInvoiceType = new GraphQLObjectType({
    name: "DetailedSingleReturnSaleInvoice",
    fields: {
        aggregations: { type: AggregationType },
        allSaleInvoice: { type: new GraphQLList(ReturnSaleInvoiceType) },
        groupBy: { type: new GraphQLList(AggregationType) }
    }
});

const DesignationType = new GraphQLObjectType({
    name: "Designation",
    fields: () => ({
        id: { type: GraphQLString },
        name: { type: GraphQLString },
        createdAt: { type: GraphQLDateTime },
        updatedAt: { type: GraphQLDateTime },
        user: { type: new GraphQLList(UserType) },
        count: { type: GraphQLInt }
    })
});

const UserType = new GraphQLObjectType({
    name: "User",
    fields: () => ({
        id: { type: GraphQLString },
        username: { type: GraphQLString },
        role: { type: GraphQLString },
        email: { type: GraphQLString },
        salary: { type: GraphQLInt },
        designation_id: { type: GraphQLString },
        designation: { type: DesignationType },
        join_date: { type: GraphQLDateTime },
        leave_date: { type: GraphQLDateTime },
        id_no: { type: GraphQLString },
        department: { type: GraphQLString },
        phone: { type: GraphQLString },
        address: { type: GraphQLString },
        blood_group: { type: GraphQLString },
        image: { type: GraphQLString },
        status: { type: GraphQLBoolean },
        token: { type: GraphQLString },
        message: { type: GraphQLString },
        saleInvoice: { type: new GraphQLList(SaleInvoiceType) },
        createdAt: { type: GraphQLDateTime },
        updatedAt: { type: GraphQLDateTime },
    })
});

const SaleProfitCountType = new GraphQLObjectType({
    name: "SaleProfitCount",
    fields: {
        type: { type: GraphQLString },
        date: { type: GraphQLString },
        amount: { type: GraphQLFloat }
    }
});

const SupplierVSCustomerType = new GraphQLObjectType({
    name: "SupplierVSCustomer",
    fields: {
        type: { type: GraphQLString },
        value: { type: GraphQLFloat }
    }
});

const CustomerSaleProfitType = new GraphQLObjectType({
    name: "CustomerSaleProfit",
    fields: {
        label: { type: GraphQLString },
        type: { type: GraphQLString },
        value: { type: GraphQLFloat }
    }
});

const CardInfoType = new GraphQLObjectType({
    name: "CardInfo",
    fields: {
        purchase_count: { type: GraphQLInt },
        purchase_total: { type: GraphQLFloat },
        sale_count: { type: GraphQLInt },
        sale_profit: { type: GraphQLFloat },
        sale_total: { type: GraphQLFloat }
    }
})

const DashboardDataType = new GraphQLObjectType({
    name: "DashboardData",
    fields: () => ({
        saleProfitCount: {
            type: new GraphQLList(SaleProfitCountType)
        },
        SupplierVSCustomer: {
            type: new GraphQLList(SupplierVSCustomerType)
        },
        customerSaleProfit: {
            type: new GraphQLList(CustomerSaleProfitType)
        },
        cardInfo: {
            type: CardInfoType
        }
    })
});

const AllPurchaseInfoType = new GraphQLObjectType({
    name: "AllPurchaseInfo",
    fields: () => ({
        aggregations: { type: AggregationType },
        allPurchaseInvoice: { type: new GraphQLList(PurchaseInvoiceType) }
    })
});

const PurchaseInvoiceProductInputType = new GraphQLInputObjectType({
    name: "PurchaseInvoiceProductInput",
    fields: () => ({
        id: { type: GraphQLString },
        product_id: { type: GraphQLString },
        product_quantity: { type: GraphQLInt },
        product_purchase_price: { type: GraphQLFloat },
    })
});

const TransactionType = new GraphQLObjectType({
    name: "Transaction",
    fields: {
        id: { type: GraphQLString },
        date: { type: GraphQLDateTime },
        debit_id: { type: GraphQLString },
        credit_id: { type: GraphQLString },
        particulars: { type: GraphQLString },
        amount: { type: GraphQLFloat },
        type: { type: GraphQLString },
        related_id: { type: GraphQLString },
        status: { type: GraphQLBoolean },
        created_at: { type: GraphQLDateTime },
        updated_at: { type: GraphQLDateTime },
        debit: {
            type: new GraphQLObjectType({
                name: "Debit",
                fields: {
                    name: { type: GraphQLString }
                }
            })
        },
        credit: {
            type: new GraphQLObjectType({
                name: "Credit",
                fields: {
                    name: { type: GraphQLString }
                }
            })
        }
    }
});

const CompletedTransactionType = new GraphQLObjectType({
    name: "CompletedTransaction",
    fields: {
        transaction1: { type: TransactionType },
        transaction2: { type: TransactionType }
    }
});

const PaymentType = new GraphQLObjectType({
    name: "PaymentType",
    fields: {
        id: { type: GraphQLString },
        name: { type: GraphQLString }
    }
});

const PurchaseInvoiceType = new GraphQLObjectType({
    name: "PurchaseInvoice",
    fields: () => ({
        id: { type: GraphQLString },
        date: { type: GraphQLDateTime },
        total_amount: { type: GraphQLFloat },
        discount: { type: GraphQLFloat },
        paid_amount: { type: GraphQLFloat },
        due_amount: { type: GraphQLFloat },
        supplier_id: { type: GraphQLString },
        note: { type: GraphQLString },
        supplier_memo_no: { type: GraphQLString },
        created_at: { type: GraphQLDateTime },
        updated_at: { type: GraphQLDateTime },
        purchaseInvoiceProduct: { type: new GraphQLList(PurchaseInvoiceProductType) },
        supplier: { type: SupplierType },
    })
});

const CustomerInputType = new GraphQLInputObjectType({
    name: "CustomerInput",
    fields: {
        name: { type: GraphQLString },
        phone: { type: GraphQLString },
        address: { type: GraphQLString },
    }
});

const SaleInvoiceWithCustomerType = new GraphQLObjectType({
    name: "SaleInvoiceWithCustomer",
    fields: {
        id: { type: GraphQLString },
        date: { type: GraphQLDateTime },
        total_amount: { type: GraphQLFloat },
        discount: { type: GraphQLFloat },
        paid_amount: { type: GraphQLFloat },
        due_amount: { type: GraphQLFloat },
        profit: { type: GraphQLFloat },
        customer_id: { type: GraphQLString },
        user_id: { type: GraphQLString },
        note: { type: GraphQLString },
        created_at: { type: GraphQLDateTime },
        updated_at: { type: GraphQLDateTime }
    }
});

const CustomerType = new GraphQLObjectType({
    name: "Customer",
    fields: {
        id: { type: GraphQLString },
        name: { type: GraphQLString },
        phone: { type: GraphQLString },
        address: { type: GraphQLString },
        status: { type: GraphQLBoolean },
        created_at: { type: GraphQLDateTime },
        updated_at: { type: GraphQLDateTime },
        saleInvoice: {
            type: new GraphQLList(SaleInvoiceWithCustomerType)
        },
        due_amount: { type: GraphQLFloat },
        allReturnSaleInvoice: { type: new GraphQLList(ReturnSaleInvoiceType) },
        allTransaction: { type: new GraphQLList(TransactionType) },

        count: { type: GraphQLInt }
    }
});

const AllCustomersType = new GraphQLObjectType({
    name: "AllCustomers",
    fields: {
        aggregations: { type: AggregationType },
        allCustomers: { type: new GraphQLList(CustomerType) }
    }
});

const SaleInvoiceType = new GraphQLObjectType({
    name: "SaleInvoice",
    fields: {
        id: { type: GraphQLString },
        date: { type: GraphQLDateTime },
        total_amount: { type: GraphQLFloat },
        discount: { type: GraphQLFloat },
        paid_amount: { type: GraphQLFloat },
        due_amount: { type: GraphQLFloat },
        profit: { type: GraphQLFloat },
        customer_id: { type: GraphQLString },
        user_id: { type: GraphQLString },
        note: { type: GraphQLString },
        created_at: { type: GraphQLDateTime },
        updated_at: { type: GraphQLDateTime },
        saleInvoiceProduct: { type: new GraphQLList(SaleInvoiceProductType) },
        customer: { type: CustomerType },
        user: { type: UserType },
        total_unit_measurement: { type: GraphQLFloat }
    }
});

const SingleReturnSaleInvoiceType = new GraphQLObjectType({
    name: "SingleReturnSaleInvoice",
    fields: {
        id: { type: GraphQLString },
        date: { type: GraphQLString },
        total_amount: { type: GraphQLInt },
        note: { type: GraphQLString },
        saleInvoice_id: { type: GraphQLString },
        status: { type: GraphQLBoolean },
        created_at: { type: GraphQLString },
        updated_at: { type: GraphQLString },
        returnSaleInvoiceProduct: { type: new GraphQLList(ReturnSaleInvoiceProductType) },
        saleInvoice: { type: SaleInvoiceType }
    }
});

const AllSaleInvoiceInfoType = new GraphQLObjectType({
    name: "AllSaleInvoiceInfo",
    fields: {
        aggregations: { type: AggregationType },
        allSaleInvoice: { type: new GraphQLList(SaleInvoiceType) }
    }
});

const SingleSaleInvoiceType = new GraphQLObjectType({
    name: "CreatedSaleInvoice",
    fields: {
        id: { type: GraphQLString },
        date: { type: GraphQLDateTime },
        total_amount: { type: GraphQLFloat },
        discount: { type: GraphQLFloat },
        paid_amount: { type: GraphQLFloat },
        due_amount: { type: GraphQLFloat },
        profit: { type: GraphQLFloat },
        customer_id: { type: GraphQLString },
        user_id: { type: GraphQLString },
        note: { type: GraphQLString },
        created_at: { type: GraphQLDateTime },
        updated_at: { type: GraphQLDateTime },
        saleInvoiceProduct: { type: new GraphQLList(SaleInvoiceProductType) },
        customer: { type: CustomerType },
        user: { type: UserType }
    }
});

const IncomeSaleInvoiceProductType = new GraphQLInputObjectType({
    name: "IncomeSaleInvoiceProduct",
    fields: {
        product_sale_price: { type: GraphQLFloat },
        product_quantity: { type: GraphQLInt },
        product_id: { type: GraphQLString }
    }
});

const ReturnPurchaseInvoiceProductType = new GraphQLObjectType({
    name: "ReturnPurchaseInvoiceProduct",
    fields: {
        id: { type: GraphQLString },
        product_id: { type: GraphQLString },
        invoice_id: { type: GraphQLString },
        product_quantity: { type: GraphQLInt },
        product_purchase_price: { type: GraphQLFloat },
        created_at: { type: GraphQLDateTime },
        updated_at: { type: GraphQLDateTime },
        product: { type: ProductType }
    }
});

const SingleReturnPurchaseInvoiceType = new GraphQLObjectType({
    name: "SingleReturnPurchaseInvoice",
    fields: {
        id: { type: GraphQLString },
        date: { type: GraphQLDateTime },
        total_amount: { type: GraphQLFloat },
        note: { type: GraphQLString },
        purchaseInvoice_id: { type: GraphQLString },
        status: { type: GraphQLBoolean },
        created_at: { type: GraphQLDateTime },
        updated_at: { type: GraphQLDateTime },
        returnPurchaseInvoiceProduct: { type: new GraphQLList(ReturnPurchaseInvoiceProductType) },
        purchaseInvoice: { type: PurchaseInvoiceType }
    }
});

const IncomeReturnPurchaseInvoiceProductType = new GraphQLInputObjectType({
    name: "IncomeReturnPurchaseInvoiceProduct",
    fields: {
        product_purchase_price: { type: GraphQLFloat },
        product_quantity: { type: GraphQLInt },
        product_id: { type: GraphQLString }
    }
});

const DetailedSinglePurchaseInvoiceType = new GraphQLObjectType({
    name: "DetailedSinglePurchaseInvoice",
    fields: {
        status: { type: GraphQLString },
        totalPaidAmount: { type: GraphQLFloat },
        totalReturnAmount: { type: GraphQLFloat },
        dueAmount: { type: GraphQLFloat },
        singlePurchaseInvoice: { type: PurchaseInvoiceType },
        returnPurchaseInvoice: { type: new GraphQLList(SingleReturnPurchaseInvoiceType) },
        transactions: { type: new GraphQLList(TransactionType) }
    }
});

const PurchaseInvoiceProductType = new GraphQLObjectType({
    name: "PurchaseInvoiceProduct",
    fields: () => ({
        id: { type: GraphQLString },
        product_id: { type: GraphQLString },
        invoice_id: { type: GraphQLString },
        product_quantity: { type: GraphQLInt },
        product_purchase_price: { type: GraphQLFloat },
        created_at: { type: GraphQLString },
        updated_at: { type: GraphQLString },
        product: { type: ProductType }
    })
});

const ReturnPurchaseInvoiceType = new GraphQLObjectType({
    name: "ReturnPurchaseInvoice",
    fields: {
        id: { type: GraphQLString },
        date: { type: GraphQLDateTime },
        total_amount: { type: GraphQLFloat },
        note: { type: GraphQLString },
        purchaseInvoice_id: { type: GraphQLString },
        status: { type: GraphQLBoolean },
        created_at: { type: GraphQLDateTime },
        updated_at: { type: GraphQLDateTime },
        purchaseInvoice: { type: PurchaseInvoiceType }
    }
});

const DetailedSingleReturnPurchaseInvoiceType = new GraphQLObjectType({
    name: "DetailedSingleReturnPurchaseInvoice",
    fields: {
        aggregations: { type: AggregationType },
        allPurchaseInvoice: { type: new GraphQLList(ReturnPurchaseInvoiceType) },
        groupBy: { type: new GraphQLList(AggregationType) }
    }
});

const SupplierType = new GraphQLObjectType({
    name: "Supplier",
    fields: () => ({
        id: { type: GraphQLString },
        name: { type: GraphQLString },
        phone: { type: GraphQLString },
        address: { type: GraphQLString },
        status: { type: GraphQLBoolean },
        created_at: { type: GraphQLDateTime },
        updated_at: { type: GraphQLDateTime },
        count: { type: GraphQLInt },
        purchaseInvoice: { type: new GraphQLList(PurchaseInvoiceType) },
        due_amount: { type: GraphQLFloat },
        allReturnPurchaseInvoice: { type: new GraphQLList(ReturnPurchaseInvoiceType) },
        allTransaction: { type: new GraphQLList(TransactionType) }
    })
});

const DetailedSingleSaleInvoiceType = new GraphQLObjectType({
    name: "DetailedSingleSaleInvoice",
    fields: {
        status: { type: GraphQLString },
        totalPaidAmount: { type: GraphQLFloat },
        totalReturnAmount: { type: GraphQLFloat },
        dueAmount: { type: GraphQLFloat },
        totalUnitMeasurement: { type: GraphQLFloat },
        singleSaleInvoice: { type: SaleInvoiceType },
        returnSaleInvoice: { type: new GraphQLList(ReturnSaleInvoiceType) },
        transactions: { type: new GraphQLList(TransactionType) }
    }
});

const IncomeSupplierType = new GraphQLInputObjectType({
    name: "IncomeSupplier",
    fields: () => ({
        name: { type: GraphQLString },
        phone: { type: GraphQLString },
        address: { type: GraphQLString },
    })
});

const AllSuppliersType = new GraphQLObjectType({
    name: "AllSuppliers",
    fields: {
        allSuppliers: { type: new GraphQLList(SupplierType) },
        aggregations: { type: AggregationType }
    }
});

const AllTransactionsType = new GraphQLObjectType({
    name: "AllTransaction",
    fields: {
        aggregations: { type: AggregationType },
        allTransaction: { type: new GraphQLList(TransactionType) }
    }
});

const AccountType = new GraphQLObjectType({
    name: "Account",
    fields: () => ({
        id: { type: GraphQLString },
        name: { type: GraphQLString },
        type: { type: GraphQLString },
        account_id: { type: GraphQLString },
        status: { type: GraphQLBoolean },
        account: {
            type: new GraphQLObjectType({
                name: "account",
                fields: {
                    name: { type: GraphQLString },
                    type: { type: GraphQLString }
                }
            })
        },
        subAccount: { type: new GraphQLList(SubAccountType) },
        debit: { type: new GraphQLList(CreditDebitType) },
        credit: { type: new GraphQLList(CreditDebitType) },
        balance: { type: GraphQLFloat }
    })
});

const CreditDebitType = new GraphQLObjectType({
    name: "CreditDebit",
    fields: {
        id: { type: GraphQLString },
        account: { type: GraphQLString },
        subAccount: { type: GraphQLString },
        totalDebit: { type: GraphQLFloat },
        totalCredit: { type: GraphQLFloat },
        balance: { type: GraphQLFloat },

        date: { type: GraphQLDateTime },
        debit_id: { type: GraphQLString },
        credit_id: { type: GraphQLString },
        particulars: { type: GraphQLString },
        amount: { type: GraphQLFloat },
        type: { type: GraphQLString },
        related_id: { type: GraphQLString },
        status: { type: GraphQLString },
        created_at: { type: GraphQLDateTime },
        updated_at: { type: GraphQLDateTime },
    }
});


const SubAccountType = new GraphQLObjectType({
    name: "SubAccount",
    fields: {
        id: { type: GraphQLString },
        name: { type: GraphQLString },
        account_id: { type: GraphQLString },
        status: { type: GraphQLBoolean },
        debit: { type: new GraphQLList(CreditDebitType) },
        credit: { type: new GraphQLList(CreditDebitType) },
        balance: { type: GraphQLFloat }
    }
});

const AllAccountInfoType = new GraphQLObjectType({
    name: "AllAccountInfo",
    fields: {
        match: { type: GraphQLBoolean },
        totalAsset: { type: GraphQLFloat },
        totalLiability: { type: GraphQLFloat },
        totalEquity: { type: GraphQLFloat },
        totalDebit: { type: GraphQLFloat },
        assets: { type: new GraphQLList(CreditDebitType) },
        liabilities: { type: new GraphQLList(CreditDebitType) },
        equity: { type: new GraphQLList(CreditDebitType) },
        totalCredit: { type: GraphQLFloat },
        debits: { type: new GraphQLList(CreditDebitType) },
        credits: { type: new GraphQLList(CreditDebitType) },
        totalRevenue: { type: GraphQLFloat },
        totalExpense: { type: GraphQLFloat },
        profit: { type: GraphQLFloat },
        revenue: { type: new GraphQLList(CreditDebitType) },
        expense: { type: new GraphQLList(CreditDebitType) },
        entire: { type: new GraphQLList(AccountType) }
    }
});

const PermissionType = new GraphQLObjectType({
    name: "Permission",
    fields: {
        id: { type: GraphQLString },
        name: { type: GraphQLString },
        createdAt: { type: GraphQLDateTime },
        updatedAt: { type: GraphQLDateTime }
    }
});

const RolePermissionType = new GraphQLObjectType({
    name: "RolePermission",
    fields: () => ({
        id: { type: GraphQLString },
        role_id: { type: GraphQLString },
        permission_id: { type: GraphQLString },
        status: { type: GraphQLBoolean },
        createdAt: { type: GraphQLDateTime },
        updatedAt: { type: GraphQLDateTime },
        role: { type: RoleType },
        permission: { type: PermissionType }
    })
});

const RoleType = new GraphQLObjectType({
    name: "Role",
    fields: {
        id: { type: GraphQLString },
        name: { type: GraphQLString },
        status: { type: GraphQLBoolean },
        createdAt: { type: GraphQLDateTime },
        updatedAt: { type: GraphQLDateTime },
        rolePermission: { type: new GraphQLList(RolePermissionType) },
        count: { type: GraphQLInt }
    }
});

const SettingType = new GraphQLObjectType({
    name: "Setting",
    fields: () => ({
        id: { type: GraphQLString },
        company_name: { type: GraphQLString },
        tag_line: { type: GraphQLString },
        address: { type: GraphQLString },
        phone: { type: GraphQLString },
        email: { type: GraphQLString },
        website: { type: GraphQLString },
        footer: { type: GraphQLString }
    })
});

const AllPaymentPurchaseInvoiceType = new GraphQLObjectType({
    name: "AllPaymentPurchaseInvoice",
    fields: {
        allPaymentPurchaseInvoice: { type: new GraphQLList(TransactionType) },
        aggregations: { type: AggregationType }
    }
});

const AllPaymentSaleInvoiceType = new GraphQLObjectType({
    name: "AllPaymentSaleInvoice",
    fields: {
        allPaymentSaleInvoice: { type: new GraphQLList(TransactionType) },
        aggregations: { type: AggregationType }
    }
});

const allTransationsReportItemType = new GraphQLObjectType({
    name: "allTransationsReportItem",
    fields: {
        total_amount: { type: GraphQLFloat },
        discount: { type: GraphQLFloat },
        paid_amount: { type: GraphQLFloat },
        due_amount: { type: GraphQLFloat },
        profit: { type: GraphQLFloat },
        note: { type: GraphQLString },
        status: { type: GraphQLString },
        updated_at: { type: GraphQLDateTime },
        saleInvoiceProduct: { type: new GraphQLList(SaleInvoiceProductType) }
    }
});

const dailyTransactionSummaryReportItemType = new GraphQLObjectType({
    name: "dailyTransactionSummaryReportItemType",
    fields: {
        total_amount: { type: GraphQLFloat },
        discount: { type: GraphQLFloat },
        paid_amount: { type: GraphQLFloat },
        due_amount: { type: GraphQLFloat },
        profit: { type: GraphQLFloat },
        note: { type: GraphQLString },
        status: { type: GraphQLString },
        updated_at: { type: GraphQLDateTime },
        saleInvoiceProduct: { type: new GraphQLList(SaleInvoiceProductType) },
        transaction: { type: new GraphQLList(TransactionType) }
    }
});

const RootQuery = new GraphQLObjectType({
    name: "RootQueryType",
    fields: {
        // Login User
        login: {
            type: UserType,
            args: {
                username: { type: GraphQLString },
                password: { type: GraphQLString }
            }, async resolve(parent, args) {
                const allUser = await prisma.user.findMany();
                const user = allUser.find(
                    (u) =>
                        u.username === args.username &&
                        bcrypt.compareSync(args.password, u.password)
                );

                if (!user)
                    return { message: "Username or password is incorrect" };

                // get permission from user roles
                const permissions = await prisma.role.findUnique({
                    where: {
                        name: user.role,
                    },
                    include: {
                        rolePermission: {
                            include: {
                                permission: true,
                            },
                        },
                    },
                });
                // store all permissions name to an array
                const permissionNames = permissions.rolePermission.map(
                    (rp) => rp.permission.name
                );
                // console.log("permissionNames", permissionNames);
                const token = jwt.sign(
                    { sub: user.id, permissions: permissionNames },
                    process.env.JWT_SECRET,
                    {
                        expiresIn: "24h",
                    }
                );
                const { password, ...userWithoutPassword } = user;
                return {
                    ...userWithoutPassword,
                    token,
                };
            }
        },
        getAllUsers: {
            type: new GraphQLList(UserType),
            args: {
                query: { type: GraphQLString },
                status: { type: GraphQLString }
            },
            async resolve(parent, args) {
                if (args.query === "all") {
                    const allUser = await prisma.user.findMany(
                        {
                            include: {
                                saleInvoice: true,
                            },
                        },
                    );

                    return (
                        allUser
                            .map((u) => {
                                const { password, ...userWithoutPassword } = u;
                                return userWithoutPassword;
                            })
                            .sort((a, b) => a.id - b.id)
                    );
                } else if (args.status === "false") {
                    const allUser = await prisma.user.findMany({
                        where: {
                            status: false,
                        },
                        include: {
                            saleInvoice: true,
                        },
                    });
                    return (
                        allUser
                            .map((u) => {
                                const { password, ...userWithoutPassword } = u;
                                return userWithoutPassword;
                            })
                            .sort((a, b) => a.id - b.id)
                    );
                } else {
                    const allUser = await prisma.user.findMany({
                        where: {
                            status: true,
                        },
                        include: {
                            saleInvoice: true,
                        },
                    });
                    return (
                        allUser
                            .map((u) => {
                                const { password, ...userWithoutPassword } = u;
                                return userWithoutPassword;
                            })
                            .sort((a, b) => a.id - b.id)
                    );
                }
            }
        },
        getSingleUser: {
            type: UserType,
            args: {
                id: { type: GraphQLString }
            },
            async resolve(parent, args) {
                const singleUser = await prisma.user.findUnique({
                    where: {
                        id: args.id,
                    },
                    include: {
                        saleInvoice: true,
                    },
                });

                if (!singleUser) return;
                const { password, ...userWithoutPassword } = singleUser;
                return userWithoutPassword;
            }
        },
        dashboardData: {
            type: DashboardDataType,
            args: {
                startdate: { type: GraphQLString },
                enddate: { type: GraphQLString }
            },
            async resolve(parent, args) {
                //==================================saleProfitCount===============================================
                // get all sale invoice by group
                const allSaleInvoice = await prisma.saleInvoice.groupBy({
                    orderBy: {
                        date: "asc",
                    },
                    by: ["date"],
                    where: {
                        date: {
                            gte: new Date(args.startdate),
                            lte: new Date(args.enddate),
                        },
                    },
                    _sum: {
                        total_amount: true,
                        paid_amount: true,
                        due_amount: true,
                        profit: true,
                    },
                    _count: {
                        id: true,
                    },
                });
                // format response data for data visualization chart in antd
                const formattedData1 = allSaleInvoice.map((item) => {
                    return {
                        type: "Sales",
                        date: item.date.toISOString().split("T")[0],
                        amount: item._sum.total_amount,
                    };
                });
                const formattedData2 = allSaleInvoice.map((item) => {
                    return {
                        type: "Profit",
                        date: item.date.toISOString().split("T")[0],
                        amount: item._sum.profit,
                    };
                });
                const formattedData3 = allSaleInvoice.map((item) => {
                    return {
                        type: "Invoice Count",
                        date: item.date.toISOString().split("T")[0],
                        amount: item._count.id,
                    };
                });
                // concat formatted data
                const saleProfitCount = formattedData1
                    .concat(formattedData2)
                    .concat(formattedData3);
                //==================================PurchaseVSSale===============================================
                // get all customer due amount
                const salesInfo = await prisma.saleInvoice.aggregate({
                    _count: {
                        id: true,
                    },
                    _sum: {
                        total_amount: true,
                    },
                });
                const purchasesInfo = await prisma.purchaseInvoice.aggregate({
                    _count: {
                        id: true,
                    },
                    _sum: {
                        total_amount: true,
                    },
                });
                // format response data for data visualization chart in antd
                const formattedData4 = [
                    { type: "sales", value: Number(salesInfo._sum.total_amount) },
                ];
                const formattedData5 = [
                    { type: "purchases", value: Number(purchasesInfo._sum.total_amount) },
                ];
                const SupplierVSCustomer = formattedData4.concat(formattedData5);
                //==================================customerSaleProfit===============================================
                // get all sale invoice by group
                const allSaleInvoiceByGroup = await prisma.saleInvoice.groupBy({
                    by: ["customer_id"],
                    _sum: {
                        total_amount: true,
                        profit: true,
                    },
                    _count: {
                        id: true,
                    },
                    where: {
                        date: {
                            gte: new Date(args.startdate),
                            lte: new Date(args.enddate),
                        },
                    },
                });
                // format response data for data visualization chart in antdantd
                const formattedData6 = await Promise.all(
                    allSaleInvoiceByGroup.map(async (item) => {
                        const customer = await prisma.customer.findUnique({
                            where: { id: item.customer_id },
                        });
                        const formattedData = {
                            label: customer.name,
                            type: "Sales",
                            value: item._sum.total_amount,
                        };
                        return formattedData;
                    })
                );
                const formattedData7 = await Promise.all(
                    allSaleInvoiceByGroup.map(async (item) => {
                        const customer = await prisma.customer.findUnique({
                            where: { id: item.customer_id },
                        });
                        return {
                            label: customer.name,
                            type: "Profit",
                            value: item._sum.profit,
                        };
                    })
                );
                // concat formatted data
                const customerSaleProfit = [...formattedData6, ...formattedData7].sort(
                    (a, b) => {
                        a.value - b.value;
                    }
                );
                //==================================cardInfo===============================================
                const purchaseInfo = await prisma.purchaseInvoice.aggregate({
                    _count: {
                        id: true,
                    },
                    _sum: {
                        total_amount: true,
                        due_amount: true,
                        paid_amount: true,
                    },
                    where: {
                        date: {
                            gte: new Date(args.startdate),
                            lte: new Date(args.enddate),
                        },
                    },
                });
                const saleInfo = await prisma.saleInvoice.aggregate({
                    _count: {
                        id: true,
                    },
                    _sum: {
                        total_amount: true,
                        due_amount: true,
                        paid_amount: true,
                        profit: true,
                    },
                    where: {
                        date: {
                            gte: new Date(args.startdate),
                            lte: new Date(args.enddate),
                        },
                    },
                });
                // concat 2 object
                const cardInfo = {
                    purchase_count: purchaseInfo._count.id,
                    purchase_total: Number(purchaseInfo._sum.total_amount),
                    sale_count: saleInfo._count.id,
                    sale_total: Number(saleInfo._sum.total_amount),
                    sale_profit: Number(saleInfo._sum.profit),
                };

                return {
                    saleProfitCount,
                    SupplierVSCustomer,
                    customerSaleProfit,
                    cardInfo,
                };
            }
        },
        allPurchaseInvoiceData: {
            type: AllPurchaseInfoType,
            args: {
                query: { type: GraphQLString },
                page: { type: GraphQLInt },
                count: { type: GraphQLInt },
                startdate: { type: GraphQLString },
                enddate: { type: GraphQLString }
            },
            async resolve(parent, args) {
                if (args.query === "info") {
                    // get purchase invoice info
                    const aggregations = await prisma.purchaseInvoice.aggregate({
                        _count: {
                            id: true,
                        },
                        _sum: {
                            total_amount: true,
                            due_amount: true,
                            paid_amount: true,
                        },
                    });

                    return { aggregations };
                } else {
                    const { skip, limit } = getPagination(args);

                    // get purchase invoice with pagination and info
                    const [aggregations, purchaseInvoices] = await prisma.$transaction([
                        // get info of selected parameter data
                        prisma.purchaseInvoice.aggregate({
                            _count: {
                                id: true,
                            },
                            _sum: {
                                total_amount: true,
                                discount: true,
                                due_amount: true,
                                paid_amount: true,
                            },
                            where: {
                                date: {
                                    gte: new Date(args.startdate),
                                    lte: new Date(args.enddate),
                                },
                            },
                        }),
                        // get purchaseInvoice paginated and by start and end date
                        prisma.purchaseInvoice.findMany({
                            orderBy: [
                                {
                                    id: "desc",
                                },
                            ],
                            skip: Number(skip),
                            take: Number(limit),
                            include: {
                                supplier: {
                                    select: {
                                        name: true,
                                    },
                                },
                            },
                            where: {
                                date: {
                                    gte: new Date(args.startdate),
                                    lte: new Date(args.enddate),
                                },
                            },
                        }),
                    ]);

                    const subAccounts = await prisma.subAccount.findMany();

                    // modify data to actual data of purchase invoice's current value by adjusting with transactions and returns
                    // get all transactions related to purchase invoice
                    const transactions = await prisma.transaction.findMany({
                        where: {
                            type: "purchase",
                            related_id: {
                                in: purchaseInvoices.map((item) => item.id),
                            },
                            OR: [
                                {
                                    credit_id: subAccounts[0].id,
                                },
                                {
                                    credit_id: subAccounts[1].id,
                                },
                            ],
                        },
                    });

                    // get all transactions related to purchase returns invoice
                    const transactions2 = await prisma.transaction.findMany({
                        where: {
                            type: "purchase_return",
                            related_id: {
                                in: purchaseInvoices.map((item) => item.id),
                            },
                            OR: [
                                {
                                    debit_id: subAccounts[0].id,
                                },
                                {
                                    debit_id: subAccounts[1].id,
                                },
                            ],
                        },
                    });

                    // calculate the discount earned amount at the time of make the payment
                    const transactions3 = await prisma.transaction.findMany({
                        where: {
                            type: "purchase",
                            related_id: {
                                in: purchaseInvoices.map((item) => item.id),
                            },
                            credit_id: subAccounts[12].id,
                        },
                        include: {
                            debit: {
                                select: {
                                    name: true,
                                },
                            },
                            credit: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    });

                    const returnPurchaseInvoice = await prisma.returnPurchaseInvoice.findMany(
                        {
                            where: {
                                purchaseInvoice_id: {
                                    in: purchaseInvoices.map((item) => item.id),
                                },
                            },
                        }
                    );

                    // calculate paid amount and due amount of individual purchase invoice from transactions and returnPurchaseInvoice and attach it to purchaseInvoices
                    const allPurchaseInvoice = purchaseInvoices.map((item) => {
                        const paidAmount = transactions
                            .filter((transaction) => transaction.related_id === item.id)
                            .reduce((acc, curr) => acc + curr.amount, 0);
                        const paidAmountReturn = transactions2
                            .filter((transaction) => transaction.related_id === item.id)
                            .reduce((acc, curr) => acc + curr.amount, 0);
                        const discountEarned = transactions3
                            .filter((transaction) => transaction.related_id === item.id)
                            .reduce((acc, curr) => acc + curr.amount, 0);
                        const returnAmount = returnPurchaseInvoice
                            .filter(
                                (returnPurchaseInvoice) =>
                                    returnPurchaseInvoice.purchaseInvoice_id === item.id
                            )
                            .reduce((acc, curr) => acc + curr.total_amount, 0);
                        return {
                            ...item,
                            paid_amount: paidAmount,
                            discount: item.discount + discountEarned,
                            due_amount:
                                item.total_amount -
                                item.discount -
                                paidAmount -
                                returnAmount +
                                paidAmountReturn -
                                discountEarned,
                        };
                    });

                    // calculate total paid_amount and due_amount from allPurchaseInvoice and attach it to aggregations
                    const totalPaidAmount = allPurchaseInvoice.reduce(
                        (acc, curr) => acc + curr.paid_amount,
                        0
                    );
                    const totalDueAmount = allPurchaseInvoice.reduce(
                        (acc, curr) => acc + curr.due_amount,
                        0
                    );
                    const totalDiscountGiven = allPurchaseInvoice.reduce(
                        (acc, curr) => acc + curr.discount,
                        0
                    );
                    aggregations._sum.paid_amount = totalPaidAmount;
                    aggregations._sum.due_amount = totalDueAmount;
                    aggregations._sum.discount = totalDiscountGiven;

                    return {
                        aggregations,
                        allPurchaseInvoice,
                    };
                }
            }
        },
        getSinglePurchaseInvoice: {
            type: DetailedSinglePurchaseInvoiceType,
            args: {
                id: { type: GraphQLString }
            }, async resolve(parent, args) {
                // get single purchase invoice information with products
                const singlePurchaseInvoice = await prisma.purchaseInvoice.findUnique({
                    where: {
                        id: args.id,
                    },
                    include: {
                        purchaseInvoiceProduct: {
                            include: {
                                product: true,
                            },
                        },
                        supplier: true,
                    },
                });
                // get all transactions related to this purchase invoice
                const transactions = await prisma.transaction.findMany({
                    where: {
                        related_id: args.id,
                        OR: [
                            {
                                type: "purchase",
                            },
                            {
                                type: "purchase_return",
                            },
                        ],
                    },
                    include: {
                        debit: {
                            select: {
                                name: true,
                            },
                        },
                        credit: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });

                const subAccounts = await prisma.subAccount.findMany();

                // transactions of the paid amount
                const transactions2 = await prisma.transaction.findMany({
                    where: {
                        type: "purchase",
                        related_id: args.id,
                        OR: [
                            {
                                credit_id: subAccounts[0].id,
                            },
                            {
                                credit_id: subAccounts[1].id,
                            },
                        ],
                    },
                });
                // transactions of the discount earned amount
                const transactions3 = await prisma.transaction.findMany({
                    where: {
                        type: "purchase",
                        related_id: args.id,
                        credit_id: subAccounts[12].id,
                    },
                });
                // transactions of the return purchase invoice's amount
                const transactions4 = await prisma.transaction.findMany({
                    where: {
                        type: "purchase_return",
                        related_id: args.id,
                        OR: [
                            {
                                debit_id: subAccounts[0].id,
                            },
                            {
                                debit_id: subAccounts[1].id,
                            },
                        ],
                    },
                });
                // get return purchase invoice information with products of this purchase invoice
                const returnPurchaseInvoice = await prisma.returnPurchaseInvoice.findMany({
                    where: {
                        purchaseInvoice_id: args.id,
                    },
                    include: {
                        returnPurchaseInvoiceProduct: {
                            include: {
                                product: true,
                            },
                        },
                    },
                });
                // sum of total paid amount
                const totalPaidAmount = transactions2.reduce(
                    (acc, item) => acc + item.amount,
                    0
                );
                // sum of total discount earned amount
                const totalDiscountAmount = transactions3.reduce(
                    (acc, item) => acc + item.amount,
                    0
                );
                // sum of total return purchase invoice amount
                const paidAmountReturn = transactions4.reduce(
                    (acc, curr) => acc + curr.amount,
                    0
                );
                // sum total amount of all return purchase invoice related to this purchase invoice
                const totalReturnAmount = returnPurchaseInvoice.reduce(
                    (acc, item) => acc + item.total_amount,
                    0
                );
                console.log(singlePurchaseInvoice.total_amount);
                console.log(singlePurchaseInvoice.discount);
                console.log(totalPaidAmount);
                console.log(totalDiscountAmount);
                console.log(totalReturnAmount);
                console.log(paidAmountReturn);
                const dueAmount =
                    singlePurchaseInvoice.total_amount -
                    singlePurchaseInvoice.discount -
                    totalPaidAmount -
                    totalDiscountAmount -
                    totalReturnAmount +
                    paidAmountReturn;
                let status = "UNPAID";
                if (dueAmount === 0) {
                    status = "PAID";
                }
                return {
                    status,
                    totalPaidAmount,
                    totalReturnAmount,
                    dueAmount,
                    singlePurchaseInvoice,
                    returnPurchaseInvoice,
                    transactions,
                };
            }
        },
        allSaleInvoiceData: {
            type: AllSaleInvoiceInfoType,
            args: {
                user: { type: GraphQLString },
                page: { type: GraphQLInt },
                count: { type: GraphQLInt },
                startdate: { type: GraphQLString },
                enddate: { type: GraphQLString }
            },
            async resolve(parent, args) {
                const { skip, limit } = getPagination(args);
                console.log(args)
                let aggregations, saleInvoices;
                if (args.user) {
                    if (args.count) {
                        [aggregations, saleInvoices] = await prisma.$transaction([
                            // get info of selected parameter data
                            prisma.saleInvoice.aggregate({
                                _count: {
                                    id: true,
                                },
                                _sum: {
                                    total_amount: true,
                                    discount: true,
                                    due_amount: true,
                                    paid_amount: true,
                                    profit: true,
                                },
                                where: {
                                    date: {
                                        gte: new Date(args.startdate),
                                        lte: new Date(args.enddate),
                                    },
                                    user_id: args.user,
                                },
                            }),
                            // get saleInvoice paginated and by start and end date
                            prisma.saleInvoice.findMany({
                                orderBy: [
                                    {
                                        id: "desc",
                                    },
                                ],
                                skip: Number(skip),
                                take: Number(limit),
                                include: {
                                    saleInvoiceProduct: {
                                        include: {
                                            product: true,
                                        },
                                    },
                                    customer: {
                                        select: {
                                            id: true,
                                            name: true,
                                        },
                                    },
                                    user: {
                                        select: {
                                            id: true,
                                            username: true,
                                        },
                                    },
                                },
                                where: {
                                    date: {
                                        gte: new Date(args.startdate),
                                        lte: new Date(args.enddate),
                                    },
                                    user_id: args.user,
                                },
                            }),
                        ]);
                    } else {
                        [aggregations, saleInvoices] = await prisma.$transaction([
                            // get info of selected parameter data
                            prisma.saleInvoice.aggregate({
                                _count: {
                                    id: true,
                                },
                                _sum: {
                                    total_amount: true,
                                    discount: true,
                                    due_amount: true,
                                    paid_amount: true,
                                    profit: true,
                                },
                                where: {
                                    date: {
                                        gte: new Date(args.startdate),
                                        lte: new Date(args.enddate),
                                    },
                                    user_id: args.user,
                                },
                            }),
                            // get saleInvoice paginated and by start and end date
                            prisma.saleInvoice.findMany({
                                orderBy: [
                                    {
                                        id: "desc",
                                    },
                                ],
                                include: {
                                    saleInvoiceProduct: {
                                        include: {
                                            product: true,
                                        },
                                    },
                                    customer: {
                                        select: {
                                            id: true,
                                            name: true,
                                        },
                                    },
                                    user: {
                                        select: {
                                            id: true,
                                            username: true,
                                        },
                                    },
                                },
                                where: {
                                    date: {
                                        gte: new Date(args.startdate),
                                        lte: new Date(args.enddate),
                                    },
                                    user_id: args.user,
                                },
                            }),
                        ]);
                    }
                } else {
                    if (args.count) {
                        [aggregations, saleInvoices] = await prisma.$transaction([
                            // get info of selected parameter data
                            prisma.saleInvoice.aggregate({
                                _count: {
                                    id: true,
                                },
                                _sum: {
                                    total_amount: true,
                                    discount: true,
                                    due_amount: true,
                                    paid_amount: true,
                                    profit: true,
                                },
                                where: {
                                    date: {
                                        gte: new Date(args.startdate),
                                        lte: new Date(args.enddate),
                                    },
                                },
                            }),
                            // get saleInvoice paginated and by start and end date
                            prisma.saleInvoice.findMany({
                                orderBy: [
                                    {
                                        id: "desc",
                                    },
                                ],
                                skip: Number(skip),
                                take: Number(limit),
                                include: {
                                    saleInvoiceProduct: {
                                        include: {
                                            product: true,
                                        },
                                    },
                                    customer: {
                                        select: {
                                            id: true,
                                            name: true,
                                        },
                                    },
                                    user: {
                                        select: {
                                            id: true,
                                            username: true,
                                        },
                                    },
                                },
                                where: {
                                    date: {
                                        gte: new Date(args.startdate),
                                        lte: new Date(args.enddate),
                                    },
                                },
                            }),
                        ]);
                    } else {
                        [aggregations, saleInvoices] = await prisma.$transaction([
                            // get info of selected parameter data
                            prisma.saleInvoice.aggregate({
                                _count: {
                                    id: true,
                                },
                                _sum: {
                                    total_amount: true,
                                    discount: true,
                                    due_amount: true,
                                    paid_amount: true,
                                    profit: true,
                                },
                                where: {
                                    date: {
                                        gte: new Date(args.startdate),
                                        lte: new Date(args.enddate),
                                    },
                                },
                            }),
                            // get saleInvoice paginated and by start and end date
                            prisma.saleInvoice.findMany({
                                orderBy: [
                                    {
                                        id: "desc",
                                    },
                                ],
                                include: {
                                    saleInvoiceProduct: {
                                        include: {
                                            product: true,
                                        },
                                    },
                                    customer: {
                                        select: {
                                            id: true,
                                            name: true,
                                        },
                                    },
                                    user: {
                                        select: {
                                            id: true,
                                            username: true,
                                        },
                                    },
                                },
                                where: {
                                    date: {
                                        gte: new Date(args.startdate),
                                        lte: new Date(args.enddate),
                                    },
                                },
                            }),
                        ]);
                    }
                }

                const subAccounts = await prisma.subAccount.findMany();

                // modify data to actual data of sale invoice's current value by adjusting with transactions and returns
                const transactions = await prisma.transaction.findMany({
                    where: {
                        type: "sale",
                        related_id: {
                            in: saleInvoices.map((item) => item.id),
                        },
                        OR: [
                            {
                                debit_id: subAccounts[0].id,
                            },
                            {
                                debit_id: subAccounts[1].id,
                            },
                        ],
                    },
                });
                // the return that paid back to customer on return invoice
                const transactions2 = await prisma.transaction.findMany({
                    where: {
                        type: "sale_return",
                        related_id: {
                            in: saleInvoices.map((item) => item.id),
                        },
                        OR: [
                            {
                                credit_id: subAccounts[0].id,
                            },
                            {
                                credit_id: subAccounts[1].id,
                            },
                        ],
                    },
                });
                // calculate the discount given amount at the time of make the payment
                const transactions3 = await prisma.transaction.findMany({
                    where: {
                        type: "sale",
                        related_id: {
                            in: saleInvoices.map((item) => item.id),
                        },
                        debit_id: subAccounts[13].id,
                    },
                    include: {
                        debit: {
                            select: {
                                name: true,
                            },
                        },
                        credit: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });
                const returnSaleInvoice = await prisma.returnSaleInvoice.findMany({
                    where: {
                        saleInvoice_id: {
                            in: saleInvoices.map((item) => item.id),
                        },
                    },
                });
                // calculate paid amount and due amount of individual sale invoice from transactions and returnSaleInvoice and attach it to saleInvoices
                const allSaleInvoice = saleInvoices.map((item) => {
                    const paidAmount = transactions
                        .filter((transaction) => transaction.related_id === item.id)
                        .reduce((acc, curr) => acc + curr.amount, 0);
                    const paidAmountReturn = transactions2
                        .filter((transaction) => transaction.related_id === item.id)
                        .reduce((acc, curr) => acc + curr.amount, 0);
                    const discountGiven = transactions3
                        .filter((transaction) => transaction.related_id === item.id)
                        .reduce((acc, curr) => acc + curr.amount, 0);
                    const returnAmount = returnSaleInvoice
                        .filter(
                            (returnSaleInvoice) => returnSaleInvoice.saleInvoice_id === item.id
                        )
                        .reduce((acc, curr) => acc + curr.total_amount, 0);
                    const totalUnitMeasurement = item.saleInvoiceProduct.reduce(
                        (acc, curr) =>
                            acc +
                            Number(curr.product.unit_measurement) *
                            Number(curr.product_quantity),
                        0
                    );
                    return {
                        ...item,
                        paid_amount: paidAmount,
                        discount: item.discount + discountGiven,
                        due_amount:
                            item.total_amount -
                            item.discount -
                            paidAmount -
                            returnAmount +
                            paidAmountReturn -
                            discountGiven,
                        total_unit_measurement: totalUnitMeasurement,
                    };
                });
                // calculate total paid_amount and due_amount from allSaleInvoice and attach it to aggregations
                const totalPaidAmount = allSaleInvoice.reduce(
                    (acc, curr) => acc + curr.paid_amount,
                    0
                );
                const totalDueAmount = allSaleInvoice.reduce(
                    (acc, curr) => acc + curr.due_amount,
                    0
                );
                const totalUnitMeasurement = allSaleInvoice.reduce(
                    (acc, curr) => acc + curr.total_unit_measurement,
                    0
                );
                const totalUnitQuantity = allSaleInvoice
                    .map((item) =>
                        item.saleInvoiceProduct.map((item) => item.product_quantity)
                    )
                    .flat()
                    .reduce((acc, curr) => acc + curr, 0);
                const totalDiscountGiven = allSaleInvoice.reduce(
                    (acc, curr) => acc + curr.discount,
                    0
                );

                aggregations._sum.paid_amount = totalPaidAmount;
                aggregations._sum.discount = totalDiscountGiven;
                aggregations._sum.due_amount = totalDueAmount;
                aggregations._sum.total_unit_measurement = totalUnitMeasurement;
                aggregations._sum.total_unit_quantity = totalUnitQuantity;

                return {
                    aggregations,
                    allSaleInvoice,
                };
            }
        },
        getSingleSaleInvoice: {
            type: DetailedSingleSaleInvoiceType,
            args: {
                id: { type: GraphQLString }
            }, async resolve(parent, args) {
                const singleSaleInvoice = await prisma.saleInvoice.findUnique({
                    where: {
                        id: args.id,
                    },
                    include: {
                        saleInvoiceProduct: {
                            include: {
                                product: true,
                            },
                        },
                        customer: true,
                        user: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                });
                // view the transactions of the sale invoice
                const transactions = await prisma.transaction.findMany({
                    where: {
                        related_id: args.id,
                        OR: [
                            {
                                type: "sale",
                            },
                            {
                                type: "sale_return",
                            },
                        ],
                    },
                    include: {
                        debit: {
                            select: {
                                name: true,
                            },
                        },
                        credit: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });
                // transactions of the paid amount
                const transactions2 = await prisma.transaction.findMany({
                    where: {
                        type: "sale",
                        related_id: args.id,
                        OR: [
                            {
                                debit_id: subAccounts[0].id,
                            },
                            {
                                debit_id: subAccounts[1].id,
                            },
                        ],
                    },
                    include: {
                        debit: {
                            select: {
                                name: true,
                            },
                        },
                        credit: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });
                // for total return amount
                const returnSaleInvoice = await prisma.returnSaleInvoice.findMany({
                    where: {
                        saleInvoice_id: args.id,
                    },
                    include: {
                        returnSaleInvoiceProduct: {
                            include: {
                                product: true,
                            },
                        },
                    },
                });
                // calculate the discount given amount at the time of make the payment
                const transactions3 = await prisma.transaction.findMany({
                    where: {
                        type: "sale",
                        related_id: args.id,
                        debit_id: subAccounts[13].id,
                    },
                    include: {
                        debit: {
                            select: {
                                name: true,
                            },
                        },
                        credit: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });

                const subAccounts = await prisma.subAccount.findMany();

                // calculate the total amount return back to customer for return sale invoice from transactions
                // transactions of the paid amount
                const transactions4 = await prisma.transaction.findMany({
                    where: {
                        type: "sale_return",
                        related_id: args.id,
                        OR: [
                            {
                                credit_id: subAccounts[0].id,
                            },
                            {
                                credit_id: subAccounts[1].id,
                            },
                        ],
                    },
                    include: {
                        debit: {
                            select: {
                                name: true,
                            },
                        },
                        credit: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });
                const paidAmountReturn = transactions4.reduce(
                    (acc, curr) => acc + curr.amount,
                    0
                );
                let status = "UNPAID";
                // sum total amount of all transactions
                const totalPaidAmount = transactions2.reduce(
                    (acc, item) => acc + item.amount,
                    0
                );
                // sum of total discount given amount at the time of make the payment
                const totalDiscountAmount = transactions3.reduce(
                    (acc, item) => acc + item.amount,
                    0
                );
                // check if total transaction amount is equal to total_amount - discount - return invoice amount
                const totalReturnAmount = returnSaleInvoice.reduce(
                    (acc, item) => acc + item.total_amount,
                    0
                );
                console.log(singleSaleInvoice.total_amount);
                console.log(singleSaleInvoice.discount);
                console.log(totalPaidAmount);
                console.log(totalDiscountAmount);
                console.log(totalReturnAmount);
                console.log(paidAmountReturn);
                const dueAmount =
                    singleSaleInvoice.total_amount -
                    singleSaleInvoice.discount -
                    totalPaidAmount -
                    totalDiscountAmount -
                    totalReturnAmount +
                    paidAmountReturn;
                if (dueAmount === 0) {
                    status = "PAID";
                }
                // calculate total unit_measurement
                const totalUnitMeasurement = singleSaleInvoice.saleInvoiceProduct.reduce(
                    (acc, item) =>
                        acc + Number(item.product.unit_measurement) * item.product_quantity,
                    0
                );
                // console.log(totalUnitMeasurement);
                return {
                    status,
                    totalPaidAmount,
                    totalReturnAmount,
                    dueAmount,
                    totalUnitMeasurement,
                    singleSaleInvoice,
                    returnSaleInvoice,
                    transactions,
                };
            }
        },
        allProductCategoryData: {
            type: new GraphQLList(CategoryType),
            args: {
                query: { type: GraphQLString },
                count: { type: GraphQLInt },
                page: { type: GraphQLInt }
            }, async resolve(parent, args) {
                if (args.query === "all") {
                    // get all product_category
                    const allProductCategories = await prisma.product_category.findMany({
                        orderBy: {
                            id: "asc",
                        },
                        include: {
                            product: true,
                        },
                    });
                    return allProductCategories;
                } else {
                    const { skip, limit } = getPagination(args);
                    // get all product_category paginated
                    const allProductCategories = await prisma.product_category.findMany({
                        orderBy: {
                            id: "asc",
                        },
                        include: {
                            product: true,
                        },
                        skip: parseInt(skip),
                        take: parseInt(limit),
                    });
                    return allProductCategories;
                }
            }
        },
        singleProductCategoryData: {
            type: CategoryType,
            args: {
                id: { type: GraphQLString }
            },
            async resolve(parent, args) {
                const singleProductCategory = await prisma.product_category.findUnique({
                    where: {
                        id: args.id,
                    },
                    include: {
                        product: true,
                    },
                });

                //adding image url to product_category
                for (let product of singleProductCategory.product) {
                    if (product.imageName) {
                        product.imageUrl = await getObjectSignedUrl(product.imageName);
                    }
                }
                return singleProductCategory;
            }
        },
        allProductsData: {
            type: AllProductsType,
            args: {
                query: { type: GraphQLString },
                prod: { type: GraphQLString },
                status: { type: GraphQLString },
                page: { type: GraphQLInt },
                count: { type: GraphQLInt }
            },
            async resolve(parnet, args) {
                let aggregations = await prisma.product.aggregate({
                    _count: {
                        id: true,
                    },
                    _sum: {
                        quantity: true,
                    },
                    where: {
                        status: true,
                    },
                });

                // get all product and calculate all purchase price and sale price
                const allProduct = await prisma.product.findMany();
                const totalPurchasePrice = allProduct.reduce((acc, cur) => {
                    return acc + cur.quantity * cur.purchase_price;
                }, 0);
                const totalSalePrice = allProduct.reduce((acc, cur) => {
                    return acc + cur.quantity * cur.sale_price;
                }, 0);

                aggregations = { ...aggregations, totalPurchasePrice, totalSalePrice }

                if (args.query === "all") {
                    const allProducts = await prisma.product.findMany({
                        orderBy: {
                            id: "desc",
                        },
                        include: {
                            product_category: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    });
                    // attach signed url to each product
                    for (let product of allProducts) {
                        if (product.imageName) {
                            product.imageUrl = `${HOST}:${PORT}/${process.env.UPLOAD_PATH}/${product.imageName}`;
                        }
                    }

                    return { allProducts, aggregations };
                } else if (args.query === "search") {
                    const allProducts = await prisma.product.findMany({
                        where: {
                            OR: [
                                {
                                    name: {
                                        contains: args.prod,
                                        mode: "insensitive",
                                    },
                                },
                                {
                                    sku: {
                                        contains: args.prod,
                                        mode: "insensitive",
                                    },
                                },
                            ],
                        },
                        orderBy: {
                            id: "desc",
                        },
                        include: {
                            product_category: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    });

                    // attach signed url to each product
                    for (let product of allProducts) {
                        if (product.imageName) {
                            product.imageUrl = `${HOST}:${PORT}/${process.env.UPLOAD_PATH}/${product.imageName}`;
                        }
                    }

                    return { allProducts, aggregations };
                } else if (args.query === "for") {
                    console.log(args)
                    const { skip, limit } = getPagination(args);
                    const allProducts = await prisma.product.findMany({
                        orderBy: {
                            id: "desc",
                        },
                        where: {
                            product_category_id: args.prod,
                            status: true,
                        },
                        include: {
                            product_category: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                        skip: Number(skip),
                        take: Number(limit),
                    });
                    // attach signed url to each product
                    for (let product of allProducts) {
                        if (product.imageName) {
                            product.imageUrl = `${HOST}:${PORT}/${process.env.UPLOAD_PATH}/${product.imageName}`;
                        }
                    }
                    return { allProducts, aggregations };
                } else if (args.query === "info") {
                    const aggregations = await prisma.product.aggregate({
                        _count: {
                            id: true,
                        },
                        _sum: {
                            quantity: true,
                        },
                        where: {
                            status: true,
                        },
                    });

                    // get all product and calculate all purchase price and sale price
                    const allProduct = await prisma.product.findMany();
                    const totalPurchasePrice = allProduct.reduce((acc, cur) => {
                        return acc + cur.quantity * cur.purchase_price;
                    }, 0);
                    const totalSalePrice = allProduct.reduce((acc, cur) => {
                        return acc + cur.quantity * cur.sale_price;
                    }, 0);

                    return {
                        aggregations: { ...aggregations, totalPurchasePrice, totalSalePrice }
                    };
                } else if (args.status === "false") {
                    const { skip, limit } = getPagination(args);
                    const allProducts = await prisma.product.findMany({
                        orderBy: {
                            id: "desc",
                        },
                        where: {
                            status: false,
                        },
                        include: {
                            product_category: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                        skip: Number(skip),
                        take: Number(limit),
                    });
                    // attach signed url to each product
                    for (let product of allProducts) {
                        if (product.imageName) {
                            product.imageUrl = `${HOST}:${PORT}/${process.env.UPLOAD_PATH}/${product.imageName}`;
                        }
                    }
                    return { allProducts, aggregations };
                } else {
                    const { skip, limit } = getPagination(args);
                    const allProducts = await prisma.product.findMany({
                        orderBy: {
                            id: "desc",
                        },
                        where: {
                            status: true,
                        },
                        include: {
                            product_category: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                        skip: Number(skip),
                        take: Number(limit),
                    });
                    // attach signed url to each product
                    for (let product of allProducts) {
                        if (product.imageName) {
                            product.imageUrl = `${HOST}:${PORT}/${process.env.UPLOAD_PATH}/${product.imageName}`;
                        }
                    }
                    return { allProducts, aggregations };
                }
            }
        }, singleProductData: {
            type: ProductType,
            args: {
                id: { type: GraphQLString }
            },
            async resolve(parent, args) {
                const singleProduct = await prisma.product.findUnique({
                    where: {
                        id: args.id,
                    },
                });
                if (singleProduct && singleProduct.imageName) {
                    singleProduct.imageUrl = `${HOST}:${PORT}/${process.env.UPLOAD_PATH}/${singleProduct.imageName}`;
                }

                return singleProduct;
            }
        },
        allSuppliersData: {
            type: AllSuppliersType,
            args: {
                query: { type: GraphQLString },
                status: { type: GraphQLString },
                page: { type: GraphQLInt },
                count: { type: GraphQLInt }
            },
            async resolve(parent, args) {
                if (args.query === "all") {
                    // get all suppliers
                    const allSuppliers = await prisma.supplier.findMany({
                        orderBy: {
                            id: "asc",
                        },
                        include: {
                            purchaseInvoice: true,
                        },
                    });

                    return { allSuppliers };
                } else if (args.status === "false") {
                    const { skip, limit } = getPagination(args);
                    // get all suppliers
                    const allSuppliers = await prisma.supplier.findMany({
                        where: {
                            status: false,
                        },
                        orderBy: {
                            id: "asc",
                        },
                        skip: parseInt(skip),
                        take: parseInt(limit),
                        include: {
                            purchaseInvoice: true,
                        },
                    });

                    return { allSuppliers };
                } else if (args.query === "info") {
                    // get all suppliers info
                    const aggregations = await prisma.supplier.aggregate({
                        _count: {
                            id: true,
                        },
                        where: {
                            status: true,
                        },
                    });
                    return { aggregations };
                } else {
                    const { skip, limit } = getPagination(args);
                    // get all suppliers paginated
                    const allSuppliers = await prisma.supplier.findMany({
                        orderBy: {
                            id: "asc",
                        },
                        where: {
                            status: true,
                        },
                        skip: parseInt(skip),
                        take: parseInt(limit),
                        include: {
                            purchaseInvoice: true,
                        },
                    });

                    return { allSuppliers };
                }
            }
        }, getSingleSupplier: {
            type: SupplierType,
            args: {
                id: { type: GraphQLString }
            }, async resolve(parent, args) {
                const singleSupplier = await prisma.supplier.findUnique({
                    where: {
                        id: args.id,
                    },
                    include: {
                        purchaseInvoice: true,
                    },
                });

                // get individual supplier's due amount by calculating: purchase invoice's total_amount - return purchase invoices - transactions
                const allPurchaseInvoiceTotalAmount =
                    await prisma.purchaseInvoice.aggregate({
                        _sum: {
                            total_amount: true,
                            discount: true,
                        },
                        where: {
                            supplier_id: args.id,
                        },
                    });
                // all invoice of a supplier with return purchase invoice nested
                const suppliersAllInvoice = await prisma.supplier.findUnique({
                    where: {
                        id: args.id,
                    },
                    include: {
                        purchaseInvoice: {
                            include: {
                                returnPurchaseInvoice: {
                                    where: {
                                        status: true,
                                    },
                                },
                            },
                        },
                    },
                });

                // get all return purchase invoice of a customer
                const allReturnPurchaseInvoice = suppliersAllInvoice.purchaseInvoice.map(
                    (invoice) => {
                        return invoice.returnPurchaseInvoice;
                    }
                );
                // calculate total return purchase invoice amount
                const TotalReturnPurchaseInvoice = allReturnPurchaseInvoice.reduce(
                    (acc, invoice) => {
                        const returnPurchaseInvoiceTotalAmount = invoice.reduce(
                            (acc, invoice) => {
                                return acc + invoice.total_amount;
                            },
                            0
                        );
                        return acc + returnPurchaseInvoiceTotalAmount;
                    },
                    0
                );
                console.log(allReturnPurchaseInvoice);
                console.log(TotalReturnPurchaseInvoice);
                // get all purchaseInvoice id
                const allPurchaseInvoiceId = suppliersAllInvoice.purchaseInvoice.map(
                    (purchaseInvoice) => {
                        return purchaseInvoice.id;
                    }
                );

                const subAccounts = await prisma.subAccount.findMany();

                // get all transactions related to purchaseInvoice
                const allPurchaseTransaction = await prisma.transaction.findMany({
                    where: {
                        type: "purchase",
                        related_id: {
                            in: allPurchaseInvoiceId,
                        },
                        OR: [
                            {
                                credit_id: subAccounts[0].id,
                            },
                            {
                                credit_id: subAccounts[1].id,
                            },
                        ],
                    },
                    include: {
                        debit: {
                            select: {
                                name: true,
                            },
                        },
                        credit: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });
                // get all transactions related to return purchaseInvoice
                const allReturnPurchaseTransaction = await prisma.transaction.findMany({
                    where: {
                        type: "purchase_return",
                        related_id: {
                            in: allPurchaseInvoiceId,
                        },
                        OR: [
                            {
                                debit_id: subAccounts[0].id,
                            },
                            {
                                debit_id: subAccounts[1].id,
                            },
                        ],
                    },
                    include: {
                        debit: {
                            select: {
                                name: true,
                            },
                        },
                        credit: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });
                // calculate the discount earned amount at the time of make the payment
                const discountEarned = await prisma.transaction.findMany({
                    where: {
                        type: "purchase",
                        related_id: {
                            in: allPurchaseInvoiceId,
                        },
                        credit_id: subAccounts[12].id,
                    },
                    include: {
                        debit: {
                            select: {
                                name: true,
                            },
                        },
                        credit: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });
                const totalPaidAmount = allPurchaseTransaction.reduce((acc, cur) => {
                    return acc + cur.amount;
                }, 0);
                const paidAmountReturn = allReturnPurchaseTransaction.reduce((acc, cur) => {
                    return acc + cur.amount;
                }, 0);
                const totalDiscountEarned = discountEarned.reduce((acc, cur) => {
                    return acc + cur.amount;
                }, 0);
                //get all transactions related to purchaseInvoiceId
                const allTransaction = await prisma.transaction.findMany({
                    where: {
                        related_id: {
                            in: allPurchaseInvoiceId,
                        },
                    },
                    include: {
                        debit: {
                            select: {
                                name: true,
                            },
                        },
                        credit: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });
                console.log(
                    "total_amount",
                    allPurchaseInvoiceTotalAmount._sum.total_amount
                );
                console.log("discount", allPurchaseInvoiceTotalAmount._sum.discount);
                console.log("totalPaidAmount", totalPaidAmount);
                console.log("totalDiscountEarned", totalDiscountEarned);
                console.log("TotalReturnPurchaseInvoice", TotalReturnPurchaseInvoice);
                console.log("paidAmountReturn", paidAmountReturn);
                const due_amount =
                    parseFloat(allPurchaseInvoiceTotalAmount._sum.total_amount) -
                    parseFloat(allPurchaseInvoiceTotalAmount._sum.discount) -
                    parseFloat(totalPaidAmount) -
                    parseFloat(totalDiscountEarned) -
                    parseFloat(TotalReturnPurchaseInvoice) +
                    parseFloat(paidAmountReturn);
                console.log("due_amount", due_amount);

                // include due_amount in singleSupplier
                singleSupplier.due_amount = due_amount ? due_amount : 0;
                singleSupplier.allReturnPurchaseInvoice = allReturnPurchaseInvoice.flat();
                singleSupplier.allTransaction = allTransaction;

                //==================== UPDATE supplier's purchase invoice information START====================
                // async is used for not blocking the main thread
                const updatedInvoices = singleSupplier.purchaseInvoice.map(async (item) => {
                    const paidAmount = allPurchaseTransaction
                        .filter((transaction) => transaction.related_id === item.id)
                        .reduce((acc, curr) => acc + curr.amount, 0);
                    const paidAmountReturn = allReturnPurchaseTransaction
                        .filter((transaction) => transaction.related_id === item.id)
                        .reduce((acc, curr) => acc + curr.amount, 0);
                    const singleDiscountEarned = discountEarned
                        .filter((transaction) => transaction.related_id === item.id)
                        .reduce((acc, curr) => acc + curr.amount, 0);
                    const returnAmount = allReturnPurchaseInvoice
                        .flat()
                        .filter(
                            (returnPurchaseInvoice) =>
                                returnPurchaseInvoice.purchaseInvoice_id === item.id
                        )
                        .reduce((acc, curr) => acc + curr.total_amount, 0);
                    return {
                        ...item,
                        paid_amount: paidAmount,
                        discount: item.discount + singleDiscountEarned,
                        due_amount:
                            item.total_amount -
                            item.discount -
                            paidAmount -
                            returnAmount +
                            paidAmountReturn -
                            singleDiscountEarned,
                    };
                });
                singleSupplier.purchaseInvoice = await Promise.all(updatedInvoices);
                //==================== UPDATE supplier's purchase invoice information END====================
                return singleSupplier;
            }
        },
        getAllPurchaseInvoice: {
            type: AllPurchaseInfoType,
            args: {
                query: { type: GraphQLString },
                page: { type: GraphQLInt },
                count: { type: GraphQLInt },
                startdate: { type: GraphQLString },
                enddate: { type: GraphQLString }
            },
            async resolve(parent, args) {
                if (args.query === "info") {
                    // get purchase invoice info
                    const aggregations = await prisma.purchaseInvoice.aggregate({
                        _count: {
                            id: true,
                        },
                        _sum: {
                            total_amount: true,
                            due_amount: true,
                            paid_amount: true,
                        },
                    });

                    return { aggregations };
                } else {
                    const { skip, limit } = getPagination(args);

                    // get purchase invoice with pagination and info
                    const [aggregations, purchaseInvoices] = await prisma.$transaction([
                        // get info of selected parameter data
                        prisma.purchaseInvoice.aggregate({
                            _count: {
                                id: true,
                            },
                            _sum: {
                                total_amount: true,
                                discount: true,
                                due_amount: true,
                                paid_amount: true,
                            },
                            where: {
                                date: {
                                    gte: new Date(args.startdate),
                                    lte: new Date(args.enddate),
                                }
                            },
                        }),
                        // get purchaseInvoice paginated and by start and end date
                        prisma.purchaseInvoice.findMany({
                            orderBy: [
                                {
                                    id: "desc",
                                },
                            ],
                            skip: Number(skip),
                            take: Number(limit),
                            include: {
                                supplier: {
                                    select: {
                                        name: true,
                                    },
                                },
                            },
                            where: {
                                date: {
                                    gte: new Date(args.startdate),
                                    lte: new Date(args.enddate),
                                }
                            },
                        }),
                    ]);

                    const subAccounts = await prisma.subAccount.findMany();

                    // modify data to actual data of purchase invoice's current value by adjusting with transactions and returns
                    // get all transactions related to purchase invoice
                    const transactions = await prisma.transaction.findMany({
                        where: {
                            type: "purchase",
                            related_id: {
                                in: purchaseInvoices.map((item) => item.id),
                            },
                            OR: [
                                {
                                    credit_id: subAccounts[0].id,
                                },
                                {
                                    credit_id: subAccounts[1].id,
                                },
                            ],
                        },
                    });

                    // get all transactions related to purchase returns invoice
                    const transactions2 = await prisma.transaction.findMany({
                        where: {
                            type: "purchase_return",
                            related_id: {
                                in: purchaseInvoices.map((item) => item.id),
                            },
                            OR: [
                                {
                                    debit_id: subAccounts[0].id,
                                },
                                {
                                    debit_id: subAccounts[1].id,
                                },
                            ],
                        },
                    });

                    // calculate the discount earned amount at the time of make the payment
                    const transactions3 = await prisma.transaction.findMany({
                        where: {
                            type: "purchase",
                            related_id: {
                                in: purchaseInvoices.map((item) => item.id),
                            },
                            credit_id: subAccounts[12].id,
                        },
                        include: {
                            debit: {
                                select: {
                                    name: true,
                                },
                            },
                            credit: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    });

                    const returnPurchaseInvoice = await prisma.returnPurchaseInvoice.findMany(
                        {
                            where: {
                                purchaseInvoice_id: {
                                    in: purchaseInvoices.map((item) => item.id),
                                },
                            },
                        }
                    );

                    // calculate paid amount and due amount of individual purchase invoice from transactions and returnPurchaseInvoice and attach it to purchaseInvoices
                    const allPurchaseInvoice = purchaseInvoices.map((item) => {
                        const paidAmount = transactions
                            .filter((transaction) => transaction.related_id === item.id)
                            .reduce((acc, curr) => acc + curr.amount, 0);
                        const paidAmountReturn = transactions2
                            .filter((transaction) => transaction.related_id === item.id)
                            .reduce((acc, curr) => acc + curr.amount, 0);
                        const discountEarned = transactions3
                            .filter((transaction) => transaction.related_id === item.id)
                            .reduce((acc, curr) => acc + curr.amount, 0);
                        const returnAmount = returnPurchaseInvoice
                            .filter(
                                (returnPurchaseInvoice) =>
                                    returnPurchaseInvoice.purchaseInvoice_id === item.id
                            )
                            .reduce((acc, curr) => acc + curr.total_amount, 0);
                        return {
                            ...item,
                            paid_amount: paidAmount,
                            discount: item.discount + discountEarned,
                            due_amount:
                                item.total_amount -
                                item.discount -
                                paidAmount -
                                returnAmount +
                                paidAmountReturn -
                                discountEarned,
                        };
                    });

                    // calculate total paid_amount and due_amount from allPurchaseInvoice and attach it to aggregations
                    const totalPaidAmount = allPurchaseInvoice.reduce(
                        (acc, curr) => acc + curr.paid_amount,
                        0
                    );
                    const totalDueAmount = allPurchaseInvoice.reduce(
                        (acc, curr) => acc + curr.due_amount,
                        0
                    );
                    const totalDiscountGiven = allPurchaseInvoice.reduce(
                        (acc, curr) => acc + curr.discount,
                        0
                    );
                    aggregations._sum.paid_amount = totalPaidAmount;
                    aggregations._sum.due_amount = totalDueAmount;
                    aggregations._sum.discount = totalDiscountGiven;

                    return {
                        aggregations,
                        allPurchaseInvoice,
                    };
                }
            }
        },
        getSinglePurchaseInvoice: {
            type: DetailedSinglePurchaseInvoiceType,
            args: {
                id: { type: GraphQLString }
            }, async resolve(parent, args) {
                // get single purchase invoice information with products
                const singlePurchaseInvoice = await prisma.purchaseInvoice.findUnique({
                    where: {
                        id: args.id,
                    },
                    include: {
                        purchaseInvoiceProduct: {
                            include: {
                                product: true,
                            },
                        },
                        supplier: true,
                    },
                });
                // get all transactions related to this purchase invoice
                const transactions = await prisma.transaction.findMany({
                    where: {
                        related_id: args.id,
                        OR: [
                            {
                                type: "purchase",
                            },
                            {
                                type: "purchase_return",
                            },
                        ],
                    },
                    include: {
                        debit: {
                            select: {
                                name: true,
                            },
                        },
                        credit: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });

                const subAccounts = await prisma.subAccount.findMany();

                // transactions of the paid amount
                const transactions2 = await prisma.transaction.findMany({
                    where: {
                        type: "purchase",
                        related_id: args.id,
                        OR: [
                            {
                                credit_id: subAccounts[0].id,
                            },
                            {
                                credit_id: subAccounts[1].id,
                            },
                        ],
                    },
                });
                // transactions of the discount earned amount
                const transactions3 = await prisma.transaction.findMany({
                    where: {
                        type: "purchase",
                        related_id: args.id,
                        credit_id: subAccounts[12].id,
                    },
                });
                // transactions of the return purchase invoice's amount
                const transactions4 = await prisma.transaction.findMany({
                    where: {
                        type: "purchase_return",
                        related_id: args.id,
                        OR: [
                            {
                                debit_id: subAccounts[0].id,
                            },
                            {
                                debit_id: subAccounts[1].id,
                            },
                        ],
                    },
                });
                // get return purchase invoice information with products of this purchase invoice
                const returnPurchaseInvoice = await prisma.returnPurchaseInvoice.findMany({
                    where: {
                        purchaseInvoice_id: args.id,
                    },
                    include: {
                        returnPurchaseInvoiceProduct: {
                            include: {
                                product: true,
                            },
                        },
                    },
                });
                // sum of total paid amount
                const totalPaidAmount = transactions2.reduce(
                    (acc, item) => acc + item.amount,
                    0
                );
                // sum of total discount earned amount
                const totalDiscountAmount = transactions3.reduce(
                    (acc, item) => acc + item.amount,
                    0
                );
                // sum of total return purchase invoice amount
                const paidAmountReturn = transactions4.reduce(
                    (acc, curr) => acc + curr.amount,
                    0
                );
                // sum total amount of all return purchase invoice related to this purchase invoice
                const totalReturnAmount = returnPurchaseInvoice.reduce(
                    (acc, item) => acc + item.total_amount,
                    0
                );
                console.log(singlePurchaseInvoice.total_amount);
                console.log(singlePurchaseInvoice.discount);
                console.log(totalPaidAmount);
                console.log(totalDiscountAmount);
                console.log(totalReturnAmount);
                console.log(paidAmountReturn);
                const dueAmount =
                    singlePurchaseInvoice.total_amount -
                    singlePurchaseInvoice.discount -
                    totalPaidAmount -
                    totalDiscountAmount -
                    totalReturnAmount +
                    paidAmountReturn;
                let status = "UNPAID";
                if (dueAmount === 0) {
                    status = "PAID";
                }
                return {
                    status,
                    totalPaidAmount,
                    totalReturnAmount,
                    dueAmount,
                    singlePurchaseInvoice,
                    returnPurchaseInvoice,
                    transactions,
                };
            }
        },
        allTransactionsData: {
            type: AllTransactionsType,
            args: {
                query: { type: GraphQLString },
                startdate: { type: GraphQLString },
                enddate: { type: GraphQLString },
                page: { type: GraphQLInt },
                count: { type: GraphQLInt }
            },
            async resolve(parent, args) {
                if (args.query === "info") {
                    const aggregations = await prisma.transaction.aggregate({
                        where: {
                            status: true,
                        },
                        _count: {
                            id: true,
                        },
                        _sum: {
                            amount: true,
                        },
                    });

                    return { aggregations };
                } else if (args.query === "all") {
                    const allTransaction = await prisma.transaction.findMany({
                        orderBy: [
                            {
                                id: "asc",
                            },
                        ],
                        include: {
                            debit: {
                                select: {
                                    name: true,
                                },
                            },
                            credit: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    });

                    return { allTransaction };
                } else if (args.query === "inactive") {
                    const { skip, limit } = getPagination(args);
                    const [aggregations, allTransaction] = await prisma.$transaction([
                        // get info of selected parameter data
                        prisma.transaction.aggregate({
                            _count: {
                                id: true,
                            },
                            _sum: {
                                amount: true,
                            },
                            where: {
                                date: {
                                    gte: new Date(args.startdate),
                                    lte: new Date(args.enddate),
                                },
                                status: false,
                            },
                        }),
                        // get transaction paginated and by start and end date
                        prisma.transaction.findMany({
                            orderBy: [
                                {
                                    id: "desc",
                                },
                            ],
                            skip: Number(skip),
                            take: Number(limit),
                            where: {
                                date: {
                                    gte: new Date(args.startdate),
                                    lte: new Date(args.enddate),
                                },
                                status: false,
                            },
                            include: {
                                debit: {
                                    select: {
                                        name: true,
                                    },
                                },
                                credit: {
                                    select: {
                                        name: true,
                                    },
                                },
                            },
                        }),
                    ]);

                    return { aggregations, allTransaction };
                } else {
                    const { skip, limit } = getPagination(args);
                    const [aggregations, allTransaction] = await prisma.$transaction([
                        // get info of selected parameter data
                        prisma.transaction.aggregate({
                            _count: {
                                id: true,
                            },
                            _sum: {
                                amount: true,
                            },
                            where: {
                                date: {
                                    gte: new Date(args.startdate),
                                    lte: new Date(args.enddate),
                                },
                                status: true,
                            },
                        }),
                        // get transaction paginated and by start and end date
                        prisma.transaction.findMany({
                            orderBy: [
                                {
                                    id: "desc",
                                },
                            ],
                            skip: Number(skip),
                            take: Number(limit),
                            where: {
                                date: {
                                    gte: new Date(args.startdate),
                                    lte: new Date(args.enddate),
                                },
                                status: true,
                            },
                            include: {
                                debit: {
                                    select: {
                                        name: true,
                                    },
                                },
                                credit: {
                                    select: {
                                        name: true,
                                    },
                                },
                            },
                        }),
                    ]);

                    return { aggregations, allTransaction };
                }
            }
        },
        getSingleTransaction: {
            type: TransactionType,
            args: {
                id: { type: GraphQLString }
            }, async resolve(parent, args) {
                const singleTransaction = await prisma.transaction.findUnique({
                    where: {
                        id: args.id,
                    },
                    include: {
                        debit: {
                            select: {
                                name: true,
                            },
                        },
                        credit: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });
                return singleTransaction;
            }
        },
        getAllAccounts: {
            type: AllAccountInfoType, //| new GraphQLList(AccountType),
            // type: new GraphQLList(AccountType),
            args: {
                query: { type: GraphQLString }
            },
            async resolve(parent, args) {
                if (args.query === "tb") {
                    const allAccount = await prisma.account.findMany({
                        orderBy: [
                            {
                                id: "asc",
                            },
                        ],
                        include: {
                            subAccount: {
                                include: {
                                    debit: {
                                        where: {
                                            status: true,
                                        },
                                    },
                                    credit: {
                                        where: {
                                            status: true,
                                        },
                                    },
                                },
                            },
                        },
                    });
                    // some up all debit and credit amount from each subAccount and add it to every subAccount object
                    let tb = {};
                    const accountInfo = allAccount.map((account) => {
                        return account.subAccount.map((subAccount) => {
                            const totalDebit = subAccount.debit.reduce((acc, debit) => {
                                return acc + debit.amount;
                            }, 0);
                            const totalCredit = subAccount.credit.reduce((acc, credit) => {
                                return acc + credit.amount;
                            }, 0);
                            return (tb = {
                                account: account.name,
                                subAccount: subAccount.name,
                                totalDebit,
                                totalCredit,
                                balance: totalDebit - totalCredit,
                            });
                        });
                    });
                    // transform accountInfo into an single array
                    const trialBalance = accountInfo.flat();
                    let debits = [];
                    let credits = [];
                    trialBalance.forEach((item) => {
                        if (item.balance > 0) {
                            debits.push(item);
                        }
                        if (item.balance < 0) {
                            credits.push(item);
                        }
                    });
                    //some up all debit and credit balance
                    const totalDebit = debits.reduce((acc, debit) => {
                        return acc + debit.balance;
                    }, 0);
                    const totalCredit = credits.reduce((acc, credit) => {
                        return acc + credit.balance;
                    }, 0);

                    // check if total debit is equal to total credit
                    let match = true;
                    if (-totalDebit === totalCredit) {
                        match = true;
                    } else {
                        match = false;
                    }
                    // res.json(allAccount);
                    return { match, totalDebit, totalCredit, debits, credits };
                } else if (args.query === "bs") {
                    const allAccount = await prisma.account.findMany({
                        orderBy: [
                            {
                                id: "asc",
                            },
                        ],
                        include: {
                            subAccount: {
                                include: {
                                    debit: {
                                        where: {
                                            status: true,
                                        },
                                    },
                                    credit: {
                                        where: {
                                            status: true,
                                        },
                                    },
                                },
                            },
                        },
                    });
                    // some up all debit and credit amount from each subAccount and add it to every subAccount object
                    let tb = {};
                    const accountInfo = allAccount.map((account) => {
                        return account.subAccount.map((subAccount) => {
                            const totalDebit = subAccount.debit.reduce((acc, debit) => {
                                return acc + debit.amount;
                            }, 0);
                            const totalCredit = subAccount.credit.reduce((acc, credit) => {
                                return acc + credit.amount;
                            }, 0);
                            return (tb = {
                                account: account.type,
                                subAccount: subAccount.name,
                                totalDebit,
                                totalCredit,
                                balance: totalDebit - totalCredit,
                            });
                        });
                    });
                    // transform accountInfo into an single array
                    const balanceSheet = accountInfo.flat();
                    let assets = [];
                    let liabilities = [];
                    let equity = [];
                    balanceSheet.forEach((item) => {
                        if (item.account === "Asset" && item.balance !== 0) {
                            assets.push(item);
                        }
                        if (item.account === "Liability" && item.balance !== 0) {
                            // convert negative balance to positive and vice versa
                            liabilities.push({
                                ...item,
                                balance: -item.balance,
                            });
                        }
                        if (item.account === "Owner's Equity" && item.balance !== 0) {
                            // convert negative balance to positive and vice versa
                            equity.push({
                                ...item,
                                balance: -item.balance,
                            });
                        }
                    });
                    //some up all asset, liability and equity balance
                    const totalAsset = assets.reduce((acc, asset) => {
                        return acc + asset.balance;
                    }, 0);
                    const totalLiability = liabilities.reduce((acc, liability) => {
                        return acc + liability.balance;
                    }, 0);
                    const totalEquity = equity.reduce((acc, equity) => {
                        return acc + equity.balance;
                    }, 0);

                    // check if total asset is equal to total liability and equity
                    let match = true;
                    if (-totalAsset === totalLiability + totalEquity) {
                        match = true;
                    } else {
                        match = false;
                    }
                    return {
                        match,
                        totalAsset,
                        totalLiability,
                        totalEquity,
                        assets,
                        liabilities,
                        equity,
                    };
                } else if (args.query === "is") {
                    const allAccount = await prisma.account.findMany({
                        orderBy: [
                            {
                                id: "asc",
                            },
                        ],
                        include: {
                            subAccount: {
                                include: {
                                    debit: {
                                        where: {
                                            status: true,
                                        },
                                    },
                                    credit: {
                                        where: {
                                            status: true,
                                        },
                                    },
                                },
                            },
                        },
                    });
                    // some up all debit and credit amount from each subAccount and add it to every subAccount object
                    let tb = {};
                    const accountInfo = allAccount.map((account) => {
                        return account.subAccount.map((subAccount) => {
                            const totalDebit = subAccount.debit.reduce((acc, debit) => {
                                return acc + debit.amount;
                            }, 0);
                            const totalCredit = subAccount.credit.reduce((acc, credit) => {
                                return acc + credit.amount;
                            }, 0);
                            return (tb = {
                                id: subAccount.id,
                                account: account.name,
                                subAccount: subAccount.name,
                                totalDebit,
                                totalCredit,
                                balance: totalDebit - totalCredit,
                            });
                        });
                    });
                    // transform accountInfo into an single array
                    const incomeStatement = accountInfo.flat();
                    let revenue = [];
                    let expense = [];
                    incomeStatement.forEach((item) => {
                        if (item.account === "Revenue" && item.balance !== 0) {
                            // convert negative balance to positive and vice versa
                            revenue.push({
                                ...item,
                                balance: -item.balance,
                            });
                        }
                        if (item.account === "Expense" && item.balance !== 0) {
                            // convert negative balance to positive and vice versa
                            expense.push({
                                ...item,
                                balance: -item.balance,
                            });
                        }
                    });

                    //some up all revenue and expense balance
                    const totalRevenue = revenue.reduce((acc, revenue) => {
                        return acc + revenue.balance;
                    }, 0);
                    const totalExpense = expense.reduce((acc, expense) => {
                        return acc + expense.balance;
                    }, 0);

                    return {
                        totalRevenue,
                        totalExpense,
                        profit: totalRevenue + totalExpense,
                        revenue,
                        expense,
                    };
                } else if (args.query == "sa") {
                    // subAccount
                    const allSubAccount = await prisma.subAccount.findMany({
                        orderBy: [
                            {
                                id: "asc",
                            },
                        ],
                        include: {
                            account: {
                                select: {
                                    name: true,
                                    type: true,
                                },
                            },
                        },
                    });
                    return { entire: allSubAccount };
                } else if (args.query == "ma") {
                    // mainAccount
                    const allSubAccount = await prisma.account.findMany({
                        orderBy: [
                            {
                                id: "asc",
                            },
                        ],
                    });
                    return { entire: allSubAccount };
                } else {
                    const allAccount = await prisma.account.findMany({
                        orderBy: [
                            {
                                id: "asc",
                            },
                        ],
                        include: {
                            subAccount: {
                                include: {
                                    debit: true,
                                    credit: true,
                                },
                            },
                        },
                    });
                    return { entire: allAccount };
                }
            }
        },
        getSingleAccount: {
            type: AccountType,
            args: {
                id: { type: GraphQLString }
            }, async resolve(parent, args) {
                const singleAccount = await prisma.subAccount.findUnique({
                    where: {
                        id: args.id,
                    },
                    include: {
                        debit: true,
                        credit: true,
                    },
                });
                // calculate balance from total debit and credit
                const totalDebit = singleAccount.debit.reduce((acc, debit) => {
                    return acc + debit.amount;
                }, 0);
                const totalCredit = singleAccount.credit.reduce((acc, credit) => {
                    return acc + credit.amount;
                }, 0);
                const balance = totalDebit - totalCredit;
                singleAccount.balance = balance;

                return singleAccount;
            }
        },
        getAllCustomers: {
            type: AllCustomersType,
            args: {
                query: { type: GraphQLString },
                status: { type: GraphQLString },
                count: { type: GraphQLInt },
                page: { type: GraphQLInt },
            },
            async resolve(parent, args) {
                if (args.query === "all") {
                    // get all customers
                    const allCustomers = await prisma.customer.findMany({
                        orderBy: {
                            id: "asc",
                        },
                        include: {
                            saleInvoice: true,
                        },
                    });
                    return { allCustomers };
                } else if (args.query === "info") {
                    // get all customer info
                    const aggregations = await prisma.customer.aggregate({
                        _count: {
                            id: true,
                        },
                        where: {
                            status: true,
                        },
                    });
                    return { aggregations };
                } else if (args.status === "false") {
                    const { skip, limit } = getPagination(args);
                    console.log(skip, limit);
                    // get all customer
                    const allCustomers = await prisma.customer.findMany({
                        orderBy: {
                            id: "asc",
                        },
                        include: {
                            saleInvoice: true,
                        },
                        where: {
                            status: false,
                        },
                        skip: parseInt(skip),
                        take: parseInt(limit),
                    });
                    return { allCustomers };
                } else {
                    const { skip, limit } = getPagination(args);
                    // get all customer paginated
                    const allCustomers = await prisma.customer.findMany({
                        orderBy: {
                            id: "asc",
                        },
                        skip: parseInt(skip),
                        take: parseInt(limit),
                        include: {
                            saleInvoice: true,
                        },
                        where: {
                            status: true,
                        },
                    });
                    return { allCustomers };
                }
            }
        },
        getSingleCustomer: {
            type: CustomerType,
            args: {
                id: { type: GraphQLString }
            },
            async resolve(parent, args) {
                const singleCustomer = await prisma.customer.findUnique({
                    where: {
                        id: args.id,
                    },
                    include: {
                        saleInvoice: true,
                    },
                });

                // get individual customer's due amount by calculating: sale invoice's total_amount - return sale invoices - transactions
                const allSaleInvoiceTotalAmount = await prisma.saleInvoice.aggregate({
                    _sum: {
                        total_amount: true,
                        discount: true,
                    },
                    where: {
                        customer_id: args.id,
                    },
                });
                // all invoice of a customer with return sale invoice nested
                const customersAllInvoice = await prisma.customer.findUnique({
                    where: {
                        id: args.id
                    },
                    include: {
                        saleInvoice: {
                            include: {
                                returnSaleInvoice: {
                                    where: {
                                        status: true,
                                    },
                                },
                            },
                        },
                    },
                });
                // get all return sale invoice of a customer
                const allReturnSaleInvoice = customersAllInvoice.saleInvoice.map(
                    (invoice) => {
                        return invoice.returnSaleInvoice;
                    }
                );
                // calculate total return sale invoice amount
                const TotalReturnSaleInvoice = allReturnSaleInvoice.reduce(
                    (acc, invoice) => {
                        const returnSaleInvoiceTotalAmount = invoice.reduce((acc, invoice) => {
                            return acc + invoice.total_amount;
                        }, 0);
                        return acc + returnSaleInvoiceTotalAmount;
                    },
                    0
                );
                console.log(allReturnSaleInvoice);
                console.log(TotalReturnSaleInvoice);
                // get all saleInvoice id
                const allSaleInvoiceId = customersAllInvoice.saleInvoice.map(
                    (saleInvoice) => {
                        return saleInvoice.id;
                    }
                );

                const subAccounts = await prisma.subAccount.findMany();

                // get all transactions related to saleInvoice
                const allSaleTransaction = await prisma.transaction.findMany({
                    where: {
                        type: "sale",
                        related_id: {
                            in: allSaleInvoiceId,
                        },
                        OR: [
                            {
                                debit_id: subAccounts[0].id,
                            },
                            {
                                debit_id: subAccounts[1].id,
                            },
                        ],
                    },
                    include: {
                        debit: {
                            select: {
                                name: true,
                            },
                        },
                        credit: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });

                // get all transactions related to return saleInvoice
                const allReturnSaleTransaction = await prisma.transaction.findMany({
                    where: {
                        type: "sale_return",
                        related_id: {
                            in: allSaleInvoiceId,
                        },
                        OR: [
                            {
                                credit_id: subAccounts[0].id,
                            },
                            {
                                credit_id: subAccounts[1].id,
                            },
                        ],
                    },
                    include: {
                        debit: {
                            select: {
                                name: true,
                            },
                        },
                        credit: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });
                // calculate the discount given amount at the time of make the payment
                const discountGiven = await prisma.transaction.findMany({
                    where: {
                        type: "sale",
                        related_id: {
                            in: allSaleInvoiceId,
                        },
                        debit_id: subAccounts[13].id,
                    },
                    include: {
                        debit: {
                            select: {
                                name: true,
                            },
                        },
                        credit: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });
                const totalPaidAmount = allSaleTransaction.reduce((acc, cur) => {
                    return acc + cur.amount;
                }, 0);
                const paidAmountReturn = allReturnSaleTransaction.reduce((acc, cur) => {
                    return acc + cur.amount;
                }, 0);
                const totalDiscountGiven = discountGiven.reduce((acc, cur) => {
                    return acc + cur.amount;
                }, 0);
                //get all transactions related to saleInvoiceId
                const allTransaction = await prisma.transaction.findMany({
                    where: {
                        related_id: {
                            in: allSaleInvoiceId,
                        },
                    },
                    include: {
                        debit: {
                            select: {
                                name: true,
                            },
                        },
                        credit: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });
                console.log("total_amount", allSaleInvoiceTotalAmount._sum.total_amount);
                console.log("discount", allSaleInvoiceTotalAmount._sum.discount);
                console.log("totalPaidAmount", totalPaidAmount);
                console.log("totalDiscountGiven", totalDiscountGiven);
                console.log("TotalReturnSaleInvoice", TotalReturnSaleInvoice);
                console.log("paidAmountReturn", paidAmountReturn);
                const due_amount =
                    parseFloat(allSaleInvoiceTotalAmount._sum.total_amount) -
                    parseFloat(allSaleInvoiceTotalAmount._sum.discount) -
                    parseFloat(totalPaidAmount) -
                    parseFloat(totalDiscountGiven) -
                    parseFloat(TotalReturnSaleInvoice) +
                    parseFloat(paidAmountReturn);
                console.log("due_amount", due_amount);

                // include due_amount in singleCustomer
                singleCustomer.due_amount = due_amount ? due_amount : 0;
                singleCustomer.allReturnSaleInvoice = allReturnSaleInvoice.flat();
                singleCustomer.allTransaction = allTransaction;
                //==================== UPDATE customer's purchase invoice information START====================
                // async is used for not blocking the main thread
                const updatedInvoices = singleCustomer.saleInvoice.map(async (item) => {
                    const paidAmount = allSaleTransaction
                        .filter((transaction) => transaction.related_id === item.id)
                        .reduce((acc, curr) => acc + curr.amount, 0);
                    const paidAmountReturn = allReturnSaleTransaction
                        .filter((transaction) => transaction.related_id === item.id)
                        .reduce((acc, curr) => acc + curr.amount, 0);
                    const singleDiscountGiven = discountGiven
                        .filter((transaction) => transaction.related_id === item.id)
                        .reduce((acc, curr) => acc + curr.amount, 0);
                    const returnAmount = allReturnSaleInvoice
                        .flat()
                        .filter(
                            (returnSaleInvoice) => returnSaleInvoice.saleInvoice_id === item.id
                        )
                        .reduce((acc, curr) => acc + curr.total_amount, 0);
                    return {
                        ...item,
                        paid_amount: paidAmount,
                        discount: item.discount + singleDiscountGiven,
                        due_amount:
                            item.total_amount -
                            item.discount -
                            paidAmount -
                            returnAmount +
                            paidAmountReturn -
                            singleDiscountGiven,
                    };
                });
                singleCustomer.saleInvoice = await Promise.all(updatedInvoices);
                //==================== UPDATE customer's sale invoice information END====================

                return singleCustomer;
            }
        },
        getAllSaleInvoice: {
            type: AllSaleInvoiceInfoType,
            args: {
                user: { type: GraphQLString },
                page: { type: GraphQLInt },
                count: { type: GraphQLInt },
                startdate: { type: GraphQLString },
                enddate: { type: GraphQLString }
            },
            async resolve(parent, args) {
                const { skip, limit } = getPagination(args);
                let aggregations, saleInvoices;
                if (args.user) {
                    if (args.count) {
                        [aggregations, saleInvoices] = await prisma.$transaction([
                            // get info of selected parameter data
                            prisma.saleInvoice.aggregate({
                                _count: {
                                    id: true,
                                },
                                _sum: {
                                    total_amount: true,
                                    discount: true,
                                    due_amount: true,
                                    paid_amount: true,
                                    profit: true,
                                },
                                where: {
                                    date: {
                                        gte: new Date(args.startdate),
                                        lte: new Date(args.enddate),
                                    },
                                    user_id: args.user,
                                },
                            }),
                            // get saleInvoice paginated and by start and end date
                            prisma.saleInvoice.findMany({
                                orderBy: [
                                    {
                                        id: "desc",
                                    },
                                ],
                                skip: Number(skip),
                                take: Number(limit),
                                include: {
                                    saleInvoiceProduct: {
                                        include: {
                                            product: true,
                                        },
                                    },
                                    customer: {
                                        select: {
                                            id: true,
                                            name: true,
                                        },
                                    },
                                    user: {
                                        select: {
                                            id: true,
                                            username: true,
                                        },
                                    },
                                },
                                where: {
                                    date: {
                                        gte: new Date(args.startdate),
                                        lte: new Date(args.enddate),
                                    },
                                    user_id: args.user,
                                },
                            }),
                        ]);
                    } else {
                        [aggregations, saleInvoices] = await prisma.$transaction([
                            // get info of selected parameter data
                            prisma.saleInvoice.aggregate({
                                _count: {
                                    id: true,
                                },
                                _sum: {
                                    total_amount: true,
                                    discount: true,
                                    due_amount: true,
                                    paid_amount: true,
                                    profit: true,
                                },
                                where: {
                                    date: {
                                        gte: new Date(args.startdate),
                                        lte: new Date(args.enddate),
                                    },
                                    user_id: args.user,
                                },
                            }),
                            // get saleInvoice paginated and by start and end date
                            prisma.saleInvoice.findMany({
                                orderBy: [
                                    {
                                        id: "desc",
                                    },
                                ],
                                include: {
                                    saleInvoiceProduct: {
                                        include: {
                                            product: true,
                                        },
                                    },
                                    customer: {
                                        select: {
                                            id: true,
                                            name: true,
                                        },
                                    },
                                    user: {
                                        select: {
                                            id: true,
                                            username: true,
                                        },
                                    },
                                },
                                where: {
                                    date: {
                                        gte: new Date(args.startdate),
                                        lte: new Date(args.enddate),
                                    },
                                    user_id: args.user,
                                },
                            }),
                        ]);
                    }
                } else {
                    if (args.count) {
                        [aggregations, saleInvoices] = await prisma.$transaction([
                            // get info of selected parameter data
                            prisma.saleInvoice.aggregate({
                                _count: {
                                    id: true,
                                },
                                _sum: {
                                    total_amount: true,
                                    discount: true,
                                    due_amount: true,
                                    paid_amount: true,
                                    profit: true,
                                },
                                where: {
                                    date: {
                                        gte: new Date(args.startdate),
                                        lte: new Date(args.enddate),
                                    },
                                },
                            }),
                            // get saleInvoice paginated and by start and end date
                            prisma.saleInvoice.findMany({
                                orderBy: [
                                    {
                                        id: "desc",
                                    },
                                ],
                                skip: Number(skip),
                                take: Number(limit),
                                include: {
                                    saleInvoiceProduct: {
                                        include: {
                                            product: true,
                                        },
                                    },
                                    customer: {
                                        select: {
                                            id: true,
                                            name: true,
                                        },
                                    },
                                    user: {
                                        select: {
                                            id: true,
                                            username: true,
                                        },
                                    },
                                },
                                where: {
                                    date: {
                                        gte: new Date(args.startdate),
                                        lte: new Date(args.enddate),
                                    },
                                },
                            }),
                        ]);
                    } else {
                        [aggregations, saleInvoices] = await prisma.$transaction([
                            // get info of selected parameter data
                            prisma.saleInvoice.aggregate({
                                _count: {
                                    id: true,
                                },
                                _sum: {
                                    total_amount: true,
                                    discount: true,
                                    due_amount: true,
                                    paid_amount: true,
                                    profit: true,
                                },
                                where: {
                                    date: {
                                        gte: new Date(args.startdate),
                                        lte: new Date(args.enddate),
                                    },
                                },
                            }),
                            // get saleInvoice paginated and by start and end date
                            prisma.saleInvoice.findMany({
                                orderBy: [
                                    {
                                        id: "desc",
                                    },
                                ],
                                include: {
                                    saleInvoiceProduct: {
                                        include: {
                                            product: true,
                                        },
                                    },
                                    customer: {
                                        select: {
                                            id: true,
                                            name: true,
                                        },
                                    },
                                    user: {
                                        select: {
                                            id: true,
                                            username: true,
                                        },
                                    },
                                },
                                where: {
                                    date: {
                                        gte: new Date(args.startdate),
                                        lte: new Date(args.enddate),
                                    },
                                },
                            }),
                        ]);
                    }
                }

                const subAccounts = await prisma.subAccount.findMany();

                // modify data to actual data of sale invoice's current value by adjusting with transactions and returns
                const transactions = await prisma.transaction.findMany({
                    where: {
                        type: "sale",
                        related_id: {
                            in: saleInvoices.map((item) => item.id),
                        },
                        OR: [
                            {
                                debit_id: subAccounts[0].id,
                            },
                            {
                                debit_id: subAccounts[1].id,
                            },
                        ],
                    },
                });
                // the return that paid back to customer on return invoice
                const transactions2 = await prisma.transaction.findMany({
                    where: {
                        type: "sale_return",
                        related_id: {
                            in: saleInvoices.map((item) => item.id),
                        },
                        OR: [
                            {
                                credit_id: subAccounts[0].id,
                            },
                            {
                                credit_id: subAccounts[1].id,
                            },
                        ],
                    },
                });
                // calculate the discount given amount at the time of make the payment
                const transactions3 = await prisma.transaction.findMany({
                    where: {
                        type: "sale",
                        related_id: {
                            in: saleInvoices.map((item) => item.id),
                        },
                        debit_id: subAccounts[13].id,
                    },
                    include: {
                        debit: {
                            select: {
                                name: true,
                            },
                        },
                        credit: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });
                const returnSaleInvoice = await prisma.returnSaleInvoice.findMany({
                    where: {
                        saleInvoice_id: {
                            in: saleInvoices.map((item) => item.id),
                        },
                    },
                });
                // calculate paid amount and due amount of individual sale invoice from transactions and returnSaleInvoice and attach it to saleInvoices
                const allSaleInvoice = saleInvoices.map((item) => {
                    const paidAmount = transactions
                        .filter((transaction) => transaction.related_id === item.id)
                        .reduce((acc, curr) => acc + curr.amount, 0);
                    const paidAmountReturn = transactions2
                        .filter((transaction) => transaction.related_id === item.id)
                        .reduce((acc, curr) => acc + curr.amount, 0);
                    const discountGiven = transactions3
                        .filter((transaction) => transaction.related_id === item.id)
                        .reduce((acc, curr) => acc + curr.amount, 0);
                    const returnAmount = returnSaleInvoice
                        .filter(
                            (returnSaleInvoice) => returnSaleInvoice.saleInvoice_id === item.id
                        )
                        .reduce((acc, curr) => acc + curr.total_amount, 0);
                    const totalUnitMeasurement = item.saleInvoiceProduct.reduce(
                        (acc, curr) =>
                            acc +
                            Number(curr.product.unit_measurement) *
                            Number(curr.product_quantity),
                        0
                    );
                    return {
                        ...item,
                        paid_amount: paidAmount,
                        discount: item.discount + discountGiven,
                        due_amount:
                            item.total_amount -
                            item.discount -
                            paidAmount -
                            returnAmount +
                            paidAmountReturn -
                            discountGiven,
                        total_unit_measurement: totalUnitMeasurement,
                    };
                });
                // calculate total paid_amount and due_amount from allSaleInvoice and attach it to aggregations
                const totalPaidAmount = allSaleInvoice.reduce(
                    (acc, curr) => acc + curr.paid_amount,
                    0
                );
                const totalDueAmount = allSaleInvoice.reduce(
                    (acc, curr) => acc + curr.due_amount,
                    0
                );
                const totalUnitMeasurement = allSaleInvoice.reduce(
                    (acc, curr) => acc + curr.total_unit_measurement,
                    0
                );
                const totalUnitQuantity = allSaleInvoice
                    .map((item) =>
                        item.saleInvoiceProduct.map((item) => item.product_quantity)
                    )
                    .flat()
                    .reduce((acc, curr) => acc + curr, 0);
                const totalDiscountGiven = allSaleInvoice.reduce(
                    (acc, curr) => acc + curr.discount,
                    0
                );

                aggregations._sum.paid_amount = totalPaidAmount;
                aggregations._sum.discount = totalDiscountGiven;
                aggregations._sum.due_amount = totalDueAmount;
                aggregations._sum.total_unit_measurement = totalUnitMeasurement;
                aggregations._sum.total_unit_quantity = totalUnitQuantity;

                return {
                    aggregations,
                    allSaleInvoice,
                };
            }
        },
        getSingleSaleInvoice: {
            type: DetailedSingleSaleInvoiceType,
            args: {
                id: { type: GraphQLString }
            }, async resolve(parent, args) {
                const singleSaleInvoice = await prisma.saleInvoice.findUnique({
                    where: {
                        id: args.id,
                    },
                    include: {
                        saleInvoiceProduct: {
                            include: {
                                product: true,
                            },
                        },
                        customer: true,
                        user: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                });
                // view the transactions of the sale invoice
                const transactions = await prisma.transaction.findMany({
                    where: {
                        related_id: args.id,
                        OR: [
                            {
                                type: "sale",
                            },
                            {
                                type: "sale_return",
                            },
                        ],
                    },
                    include: {
                        debit: {
                            select: {
                                name: true,
                            },
                        },
                        credit: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });

                const subAccounts = await prisma.subAccount.findMany();

                // transactions of the paid amount
                const transactions2 = await prisma.transaction.findMany({
                    where: {
                        type: "sale",
                        related_id: args.id,
                        OR: [
                            {
                                debit_id: subAccounts[0].id,
                            },
                            {
                                debit_id: subAccounts[1].id,
                            },
                        ],
                    },
                    include: {
                        debit: {
                            select: {
                                name: true,
                            },
                        },
                        credit: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });
                // for total return amount
                const returnSaleInvoice = await prisma.returnSaleInvoice.findMany({
                    where: {
                        saleInvoice_id: args.id,
                    },
                    include: {
                        returnSaleInvoiceProduct: {
                            include: {
                                product: true,
                            },
                        },
                    },
                });
                // calculate the discount given amount at the time of make the payment
                const transactions3 = await prisma.transaction.findMany({
                    where: {
                        type: "sale",
                        related_id: args.id,
                        debit_id: subAccounts[13].id,
                    },
                    include: {
                        debit: {
                            select: {
                                name: true,
                            },
                        },
                        credit: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });

                // calculate the total amount return back to customer for return sale invoice from transactions
                // transactions of the paid amount
                const transactions4 = await prisma.transaction.findMany({
                    where: {
                        type: "sale_return",
                        related_id: args.id,
                        OR: [
                            {
                                credit_id: subAccounts[0].id,
                            },
                            {
                                credit_id: subAccounts[1].id,
                            },
                        ],
                    },
                    include: {
                        debit: {
                            select: {
                                name: true,
                            },
                        },
                        credit: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });
                const paidAmountReturn = transactions4.reduce(
                    (acc, curr) => acc + curr.amount,
                    0
                );
                let status = "UNPAID";
                // sum total amount of all transactions
                const totalPaidAmount = transactions2.reduce(
                    (acc, item) => acc + item.amount,
                    0
                );
                // sum of total discount given amount at the time of make the payment
                const totalDiscountAmount = transactions3.reduce(
                    (acc, item) => acc + item.amount,
                    0
                );
                // check if total transaction amount is equal to total_amount - discount - return invoice amount
                const totalReturnAmount = returnSaleInvoice.reduce(
                    (acc, item) => acc + item.total_amount,
                    0
                );
                console.log(singleSaleInvoice.total_amount);
                console.log(singleSaleInvoice.discount);
                console.log(totalPaidAmount);
                console.log(totalDiscountAmount);
                console.log(totalReturnAmount);
                console.log(paidAmountReturn);
                const dueAmount =
                    singleSaleInvoice.total_amount -
                    singleSaleInvoice.discount -
                    totalPaidAmount -
                    totalDiscountAmount -
                    totalReturnAmount +
                    paidAmountReturn;
                if (dueAmount === 0) {
                    status = "PAID";
                }
                // calculate total unit_measurement
                const totalUnitMeasurement = singleSaleInvoice.saleInvoiceProduct.reduce(
                    (acc, item) =>
                        acc + Number(item.product.unit_measurement) * item.product_quantity,
                    0
                );
                // console.log(totalUnitMeasurement);
                return {
                    status,
                    totalPaidAmount,
                    totalReturnAmount,
                    dueAmount,
                    totalUnitMeasurement,
                    singleSaleInvoice,
                    returnSaleInvoice,
                    transactions,
                };
            }
        },
        getAllDesignation: {
            type: new GraphQLList(DesignationType),
            args: {
                query: { type: GraphQLString },
                count: { type: GraphQLInt },
                page: { type: GraphQLInt }
            },
            async resolve(parent, args) {
                if (args.query === "all") {
                    // get all designation
                    const allDesignation = await prisma.designation.findMany({
                        orderBy: {
                            id: "asc",
                        },
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    email: true,
                                    role: true,
                                    salary: true,
                                    designation: true,
                                    join_date: true,
                                    leave_date: true,
                                    phone: true,
                                    id_no: true,
                                    address: true,
                                    blood_group: true,
                                    image: true,
                                    status: true,
                                    createdAt: true,
                                    updatedAt: true,
                                },
                            },
                        },
                    });
                    return allDesignation;
                } else {
                    const { skip, limit } = getPagination(args);
                    // get all designation paginated
                    const allDesignation = await prisma.designation.findMany({
                        orderBy: {
                            id: "asc",
                        },
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    email: true,
                                    role: true,
                                    salary: true,
                                    designation: true,
                                    join_date: true,
                                    leave_date: true,
                                    phone: true,
                                    id_no: true,
                                    address: true,
                                    blood_group: true,
                                    image: true,
                                    status: true,
                                    createdAt: true,
                                    updatedAt: true,
                                },
                            },
                        },
                        skip: parseInt(skip),
                        take: parseInt(limit),
                    });
                    return allDesignation;
                }
            }
        },
        getSingleDesignation: {
            type: DesignationType,
            args: {
                id: { type: GraphQLString }
            }, async resolve(parent, args) {
                const singleDesignation = await prisma.designation.findUnique({
                    where: {
                        id: args.id,
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                email: true,
                                role: true,
                                salary: true,
                                designation: true,
                                join_date: true,
                                leave_date: true,
                                phone: true,
                                id_no: true,
                                address: true,
                                blood_group: true,
                                image: true,
                                status: true,
                                createdAt: true,
                                updatedAt: true,
                            },
                        },
                    },
                });
                return singleDesignation;
            }
        },
        getSingleRole: {
            type: RoleType,
            args: {
                id: { type: GraphQLString }
            },
            async resolve(parent, args) {
                const singleRole = await prisma.role.findUnique({
                    where: {
                        id: args.id,
                    },
                    include: {
                        rolePermission: {
                            include: {
                                permission: true,
                            },
                        },
                    },
                });

                return singleRole;
            }
        },
        getAllRole: {
            type: new GraphQLList(RoleType),
            args: {
                query: { type: GraphQLString },
                status: { type: GraphQLString },
                count: { type: GraphQLInt },
                page: { type: GraphQLInt }
            }, async resolve(parent, args) {
                if (args.query === "all") {
                    const allRole = await prisma.role.findMany({
                        orderBy: [
                            {
                                id: "asc",
                            },
                        ],
                        include: {
                            rolePermission: {
                                include: {
                                    permission: true,
                                },
                            },
                        },
                    });

                    return allRole;
                } else if (args.status === "false") {
                    const { skip, limit } = getPagination(args);
                    const allRole = await prisma.role.findMany({
                        where: {
                            status: false,
                        },
                        orderBy: [
                            {
                                id: "asc",
                            },
                        ],
                        skip: Number(skip),
                        take: Number(limit),
                        include: {
                            rolePermission: {
                                include: {
                                    permission: true,
                                },
                            },
                        },
                    });
                    return allRole;
                } else {
                    const { skip, limit } = getPagination(args);
                    const allRole = await prisma.role.findMany({
                        orderBy: [
                            {
                                id: "asc",
                            },
                        ],
                        where: {
                            status: true,
                        },
                        skip: Number(skip),
                        take: Number(limit),
                        include: {
                            rolePermission: {
                                include: {
                                    permission: true,
                                },
                            },
                        },
                    });

                    return allRole;
                }
            }
        },
        getSetting: {
            type: SettingType,
            async resolve() {
                const newSetting = await prisma.appSetting.findFirst();
                return newSetting;
            }
        },

        getAllRolePermission: {
            type: new GraphQLList(RolePermissionType),
            args: {
                query: { type: GraphQLString },
                count: { type: GraphQLInt },
                page: { type: GraphQLInt }
            },
            async resolve(parent, args) {
                if (args.query === "all") {
                    const allRolePermission = await prisma.rolePermission.findMany({
                        orderBy: [
                            {
                                id: "asc",
                            },
                        ],
                        include: {
                            role: true,
                            permission: true,
                        },
                    });
                    return allRolePermission;
                } else {
                    const { skip, limit } = getPagination(args);
                    const allRolePermission = await prisma.rolePermission.findMany({
                        orderBy: [
                            {
                                id: "asc",
                            },
                        ],
                        skip: Number(skip),
                        take: Number(limit),
                        include: {
                            role: true,
                            permission: true,
                        },
                    });

                    return allRolePermission;
                }
            }
        },
        getSingleRolePermission: {
            type: RolePermissionType,
            args: {
                id: { type: GraphQLString }
            },
            async resolve(parent, args) {
                const singleRolePermission = await prisma.rolePermission.findUnique({
                    where: {
                        id: args.id,
                    },
                });
                return singleRolePermission;
            }
        },
        getAllPermission: {
            type: new GraphQLList(PermissionType),
            args: {
                query: { type: GraphQLString },
                page: { type: GraphQLInt },
                count: { type: GraphQLInt }
            },
            async resolve(parent, args) {
                if (args.query === "all") {
                    const allRole = await prisma.permission.findMany({
                        orderBy: [
                            {
                                id: "asc",
                            },
                        ],
                    });

                    return allRole;
                } else {
                    const { skip, limit } = getPagination(args);
                    const allRole = await prisma.permission.findMany({
                        orderBy: [
                            {
                                id: "asc",
                            },
                        ],
                        skip: Number(skip),
                        take: Number(limit),
                    });

                    return allRole;
                }
            }
        },

        getAllReturnPurchaseInvoice: {
            type: DetailedSingleReturnPurchaseInvoiceType,
            args: {
                query: { type: GraphQLString },
                startdate: { type: GraphQLString },
                enddate: { type: GraphQLString },
                status: { type: GraphQLString },
                count: { type: GraphQLInt },
                page: { type: GraphQLInt },
            },
            async resolve(parent, args) {
                if (args.query === "info") {
                    // get purchase invoice info
                    const aggregations = await prisma.returnPurchaseInvoice.aggregate({
                        _count: {
                            id: true,
                        },
                        _sum: {
                            total_amount: true,
                        },
                    });
                    return { aggregations }
                } else if (args.query === "all") {
                    // get all purchase invoice
                    const allPurchaseInvoice = await prisma.returnPurchaseInvoice.findMany({
                        include: {
                            purchaseInvoice: true,
                        },
                    });
                    return { allPurchaseInvoice };
                } else if (args.query === "group") {
                    // get all purchase invoice
                    const groupBy = await prisma.returnPurchaseInvoice.groupBy({
                        orderBy: {
                            date: "asc",
                        },
                        by: ["date"],
                        _sum: {
                            total_amount: true,
                        },
                        _count: {
                            id: true,
                        },
                    });
                    return { groupBy };
                } else if (args.status === "false") {
                    const { skip, limit } = getPagination(args);
                    const [aggregations, allPurchaseInvoice] = await prisma.$transaction([
                        // get info of selected parameter data
                        prisma.returnPurchaseInvoice.aggregate({
                            _count: {
                                id: true,
                            },
                            _sum: {
                                total_amount: true,
                            },
                            where: {
                                date: {
                                    gte: new Date(args.startdate),
                                    lte: new Date(args.enddate),
                                },
                                status: false,
                            },
                        }),
                        // get returnPurchaseInvoice paginated and by start and end date
                        prisma.returnPurchaseInvoice.findMany({
                            orderBy: [
                                {
                                    id: "desc",
                                },
                            ],
                            skip: Number(skip),
                            take: Number(limit),
                            include: {
                                purchaseInvoice: true,
                            },
                            where: {
                                date: {
                                    gte: new Date(args.startdate),
                                    lte: new Date(args.enddate),
                                },
                                status: false,
                            },
                        }),
                    ]);
                    return { aggregations, allPurchaseInvoice };
                } else {
                    const { skip, limit } = getPagination(args);

                    // get purchase invoice with pagination and info
                    const [aggregations, allPurchaseInvoice] = await prisma.$transaction([
                        // get info of selected parameter data
                        prisma.returnPurchaseInvoice.aggregate({
                            _count: {
                                id: true,
                            },
                            _sum: {
                                total_amount: true,
                            },
                            where: {
                                date: {
                                    gte: new Date(args.startdate),
                                    lte: new Date(args.enddate),
                                },
                                status: true,
                            },
                        }),
                        // get returnPurchaseInvoice paginated and by start and end date
                        prisma.returnPurchaseInvoice.findMany({
                            orderBy: [
                                {
                                    id: "desc",
                                },
                            ],
                            skip: Number(skip),
                            take: Number(limit),
                            include: {
                                purchaseInvoice: true,
                            },
                            where: {
                                date: {
                                    gte: new Date(args.startdate),
                                    lte: new Date(args.enddate),
                                },
                                status: true,
                            },
                        }),
                    ]);
                    return { aggregations, allPurchaseInvoice };
                }
            }
        }, getSingleReturnPurchaseInvoice: {
            type: SingleReturnPurchaseInvoiceType,
            args: {
                id: { type: GraphQLString }
            }, async resolve(parent, args) {
                const singleProduct = await prisma.returnPurchaseInvoice.findUnique({
                    where: {
                        id: args.id,
                    },
                    include: {
                        returnPurchaseInvoiceProduct: {
                            include: {
                                product: true,
                            },
                        },
                        purchaseInvoice: true,
                    },
                });
                return singleProduct;
            }
        },

        getAllReturnSaleInvoice: { //AggregationType | new GraphQLList(ReturnSaleInvoiceType) | new GraphQLList(GroupType) | 
            type: DetailedSingleReturnSaleInvoiceType,
            args: {
                query: { type: GraphQLString },
                startdate: { type: GraphQLString },
                enddate: { type: GraphQLString },
                status: { type: GraphQLString },
                count: { type: GraphQLInt },
                page: { type: GraphQLInt },
            },
            async resolve(parent, args) {
                if (args.query === "info") {
                    // get sale invoice info
                    const aggregations = await prisma.returnSaleInvoice.aggregate({
                        _count: {
                            id: true,
                        },
                        _sum: {
                            total_amount: true,
                        },
                    });
                    return { aggregations };
                } else if (args.query === "all") {
                    // get all sale invoice
                    const allSaleInvoice = await prisma.returnSaleInvoice.findMany({
                        include: {
                            saleInvoice: true,
                        },
                    });
                    return { allSaleInvoice };
                } else if (args.query === "group") {
                    // get all sale invoice
                    const groupBy = await prisma.returnSaleInvoice.groupBy({
                        orderBy: {
                            date: "asc",
                        },
                        by: ["date"],
                        _sum: {
                            total_amount: true,
                        },
                        _count: {
                            id: true,
                        },
                    });
                    return { groupBy };
                } else if (args.status === "false") {
                    const { skip, limit } = getPagination(args);
                    const [aggregations, allSaleInvoice] = await prisma.$transaction([
                        // get info of selected parameter data
                        prisma.returnSaleInvoice.aggregate({
                            _count: {
                                id: true,
                            },
                            _sum: {
                                total_amount: true,
                            },
                            where: {
                                date: {
                                    gte: new Date(args.startdate),
                                    lte: new Date(args.enddate),
                                },
                                status: false,
                            },
                        }),
                        // get returnsaleInvoice paginated and by start and end date
                        prisma.returnSaleInvoice.findMany({
                            orderBy: [
                                {
                                    id: "desc",
                                },
                            ],
                            skip: Number(skip),
                            take: Number(limit),
                            include: {
                                saleInvoice: true,
                            },
                            where: {
                                date: {
                                    gte: new Date(args.startdate),
                                    lte: new Date(args.enddate),
                                },
                                status: false,
                            },
                        }),
                    ]);
                    return { aggregations, allSaleInvoice };
                } else {
                    const { skip, limit } = getPagination(args);
                    // get sale invoice with pagination and info
                    const [aggregations, allSaleInvoice] = await prisma.$transaction([
                        // get info of selected parameter data
                        prisma.returnSaleInvoice.aggregate({
                            _count: {
                                id: true,
                            },
                            _sum: {
                                total_amount: true,
                            },
                            where: {
                                date: {
                                    gte: new Date(args.startdate),
                                    lte: new Date(args.enddate),
                                },
                                status: true,
                            },
                        }),
                        // get returnsaleInvoice paginated and by start and end date
                        prisma.returnSaleInvoice.findMany({
                            orderBy: [
                                {
                                    id: "desc",
                                },
                            ],
                            skip: Number(skip),
                            take: Number(limit),
                            include: {
                                saleInvoice: true,
                            },
                            where: {
                                date: {
                                    gte: new Date(args.startdate),
                                    lte: new Date(args.enddate),
                                },
                                status: true,
                            },
                        }),
                    ]);
                    return { aggregations, allSaleInvoice };
                }
            }
        },
        getSingleReturnSaleInvoice: {
            type: SingleReturnSaleInvoiceType,
            args: {
                id: { type: GraphQLString }
            }, async resolve(parent, args) {
                const singleProduct = await prisma.returnSaleInvoice.findUnique({
                    where: {
                        id: args.id,
                    },
                    include: {
                        returnSaleInvoiceProduct: {
                            include: {
                                product: true,
                            },
                        },
                        saleInvoice: true,
                    },
                });
                return singleProduct;
            }
        },

        getAllPaymentPurchaseInvoice: {
            type: AllPaymentPurchaseInvoiceType,
            args: {
                query: { type: GraphQLString },
                page: { type: GraphQLInt },
                count: { type: GraphQLInt }
            },
            async resolve(parent, args) {
                if (args.query === "all") {
                    const allPaymentPurchaseInvoice = await prisma.transaction.findMany({
                        where: {
                            type: "purchase",
                        },
                        orderBy: {
                            id: "desc",
                        },
                    });

                    return { allPaymentPurchaseInvoice };
                } else if (args.query === "info") {
                    const aggregations = await prisma.transaction.aggregate({
                        where: {
                            type: "purchase",
                        },
                        _count: {
                            id: true,
                        },
                        _sum: {
                            amount: true,
                        },
                    });

                    return { aggregations };
                } else {
                    const { skip, limit } = getPagination(args);
                    const allPaymentPurchaseInvoice = await prisma.transaction.findMany({
                        where: {
                            type: "purchase",
                        },
                        orderBy: {
                            id: "desc",
                        },
                        skip: Number(skip),
                        take: Number(limit),
                    });

                    return { allPaymentPurchaseInvoice };
                }
            }
        },

        getAllPaymentSaleInvoice: {
            type: AllPaymentSaleInvoiceType,
            args: {
                query: { type: GraphQLString },
                page: { type: GraphQLInt },
                count: { type: GraphQLInt }
            },
            async resolve(parent, args) {
                if (args.query === "all") {
                    const allPaymentSaleInvoice = await prisma.transaction.findMany({
                        where: {
                            type: "payment_sale_invoice",
                        },
                        orderBy: {
                            id: "desc",
                        },
                    });

                    return { allPaymentSaleInvoice };
                } else if (args.query === "info") {
                    const aggregations = await prisma.transaction.aggregate({
                        where: {
                            type: "payment_sale_invoice",
                        },
                        _count: {
                            id: true,
                        },
                        _sum: {
                            amount: true,
                        },
                    });

                    return { aggregations };
                } else {
                    const { skip, limit } = getPagination(args);
                    const allPaymentSaleInvoice = await prisma.transaction.findMany({
                        where: {
                            type: "payment_sale_invoice",
                        },
                        orderBy: {
                            id: "desc",
                        },
                        skip: Number(skip),
                        take: Number(limit),
                    });

                    return { allPaymentSaleInvoice };
                }
            }
        },

        allTransactionsReportData: {
            type: new GraphQLList(allTransationsReportItemType),
            args: {
                startdate: { type: GraphQLString },
                enddate: { type: GraphQLString },
                userId: { type: GraphQLString },
                customerId: { type: GraphQLString }
            },
            async resolve(parent, args) {
                const allSalesInvoice = await prisma.saleInvoice.findMany({
                    where: {
                        date: {
                            gte: new Date(args.startdate),
                            lte: new Date(args.enddate),
                        },
                        user_id: args.userId,
                        customer_id: args.customerId
                    },
                    include: {
                        saleInvoiceProduct: {
                            include: {
                                product: true,
                            }
                        }
                    }
                });

                const subAccounts = await prisma.subAccount.findMany();

                for (let i = 0; i < allSalesInvoice.length; i++) {
                    // transactions of the paid amount
                    const transactions2 = await prisma.transaction.findMany({
                        where: {
                            type: "purchase",
                            related_id: allSalesInvoice[i].id,
                            OR: [
                                {
                                    credit_id: subAccounts[0].id,
                                },
                                {
                                    credit_id: subAccounts[1].id,
                                },
                            ],
                        },
                    });
                    // transactions of the discount earned amount
                    const transactions3 = await prisma.transaction.findMany({
                        where: {
                            type: "purchase",
                            related_id: allSalesInvoice[i].id,
                            credit_id: subAccounts[12].id,
                        },
                    });
                    // transactions of the return purchase invoice's amount
                    const transactions4 = await prisma.transaction.findMany({
                        where: {
                            type: "purchase_return",
                            related_id: allSalesInvoice[i].id,
                            OR: [
                                {
                                    debit_id: subAccounts[0].id,
                                },
                                {
                                    debit_id: subAccounts[1].id,
                                },
                            ],
                        },
                    });
                    // get return purchase invoice information with products of this purchase invoice
                    const returnPurchaseInvoice = await prisma.returnPurchaseInvoice.findMany({
                        where: {
                            purchaseInvoice_id: allSalesInvoice[i].id,
                        },
                        include: {
                            returnPurchaseInvoiceProduct: {
                                include: {
                                    product: true,
                                },
                            },
                        },
                    });

                    // sum of total paid amount
                    const totalPaidAmount = transactions2.reduce(
                        (acc, item) => acc + item.amount,
                        0
                    );
                    // sum of total discount earned amount
                    const totalDiscountAmount = transactions3.reduce(
                        (acc, item) => acc + item.amount,
                        0
                    );
                    // sum of total return purchase invoice amount
                    const paidAmountReturn = transactions4.reduce(
                        (acc, curr) => acc + curr.amount,
                        0
                    );
                    // sum total amount of all return purchase invoice related to this purchase invoice
                    const totalReturnAmount = returnPurchaseInvoice.reduce(
                        (acc, item) => acc + item.total_amount,
                        0
                    );

                    const dueAmount =
                        allSalesInvoice[i].total_amount -
                        allSalesInvoice[i].discount -
                        totalPaidAmount -
                        totalDiscountAmount -
                        totalReturnAmount +
                        paidAmountReturn;
                    if (dueAmount === 0) {
                        allSalesInvoice[i].status = "PAID";
                    } else {
                        allSalesInvoice[i].status = "UNPAID";
                    }
                }

                return allSalesInvoice;
            }
        },

        dailyTransactionSummaryReportData: {
            type: new GraphQLList(dailyTransactionSummaryReportItemType),
            args: {
                date: { type: GraphQLString },
                userId: { type: GraphQLString },
                customerId: { type: GraphQLString }
            },
            async resolve(parent, args) {
                const allSalesInvoice = await prisma.saleInvoice.findMany({
                    where: {
                        date: new Date(args.date),
                        user_id: args.userId,
                        customer_id: args.customerId
                    },
                    include: {
                        saleInvoiceProduct: {
                            include: {
                                product: true,
                            }
                        },
                        transaction: true
                    }
                });
                return allSalesInvoice;
            }
        },

        getSinglePaymentType: {
            type: PaymentType,
            args: {
                id: { type: GraphQLString }
            }, async resolve(parent, args) {
                const singlePaymentType = await prisma.paymentType.findUnique({
                    where: {
                        id: args.id,
                    }
                });
                return singlePaymentType;
            }
        },

        getAllPaymentTypes: {
            type: new GraphQLList(PaymentType),
            async resolve(parent, args) {
                const allPaymentTypes = await prisma.paymentType.findMany();
                return allPaymentTypes;
            }
        }
    }
});

const Mutation = new GraphQLObjectType({
    name: "Mutation",
    fields: {
        // Create a new User
        createUser: {
            type: UserType,
            args: {
                username: { type: GraphQLString },
                password: { type: GraphQLString },
                join_date: { type: GraphQLString },
                leave_date: { type: GraphQLString },
                role: { type: GraphQLString },
                email: { type: GraphQLString },
                salary: { type: GraphQLInt },
                id_no: { type: GraphQLString },
                department: { type: GraphQLString },
                phone: { type: GraphQLString },
                address: { type: GraphQLString },
                blood_group: { type: GraphQLString },
                image: { type: GraphQLString },
                status: { type: GraphQLBoolean },
                designation_id: { type: GraphQLString }
            },
            async resolve(parent, args) {
                const join_date = new Date(args.join_date).toISOString().split("T")[0];
                const leave_date = new Date(args.leave_date)
                    .toISOString()
                    .split("T")[0];

                const hash = await bcrypt.hash(args.password, saltRounds);
                const createdUser = await prisma.user.create({
                    data: {
                        username: args.username,
                        password: hash,
                        role: args.role,
                        email: args.email,
                        salary: parseInt(args.salary),
                        join_date: new Date(join_date),
                        leave_date: new Date(leave_date),
                        id_no: args.id_no,
                        department: args.department,
                        phone: args.phone,
                        address: args.address,
                        blood_group: args.blood_group,
                        image: args.image,
                        status: args.status,
                        designation: {
                            connect: {
                                id: args.designation_id,
                            },
                        },
                    },
                });
                const { password, ...userWithoutPassword } = createdUser;
                return userWithoutPassword;
            },
        },

        // Update User
        updateSingleUser: {
            type: UserType,
            args: {
                id: { type: GraphQLString },
                username: { type: GraphQLString },
                password: { type: GraphQLString },
                role: { type: GraphQLString },
                email: { type: GraphQLString },
                salary: { type: GraphQLInt },
                join_date: { type: GraphQLString },
                leave_date: { type: GraphQLString },
                id_no: { type: GraphQLString },
                department: { type: GraphQLString },
                phone: { type: GraphQLString },
                address: { type: GraphQLString },
                blood_group: { type: GraphQLString },
                image: { type: GraphQLString },
                status: { type: GraphQLBoolean },
                designation_id: { type: GraphQLString }
            },
            async resolve(parent, args, context) {
                const user = gqlauthorize(context);
                if (!user) return { message: "unauthorized user" }
                if (user.permissions.includes("updateUser")) {
                    const hash = await bcrypt.hash(args.password, saltRounds);
                    const join_date = new Date(args.join_date)
                        .toISOString()
                        .split("T")[0];
                    const leave_date = new Date(args.leave_date)
                        .toISOString()
                        .split("T")[0];
                    const updateUser = await prisma.user.update({
                        where: {
                            id: args.id,
                        },
                        data: {
                            username: args.username,
                            role: args.role,
                            email: args.email,
                            password: hash,
                            salary: parseInt(args.salary),
                            join_date: new Date(join_date),
                            leave_date: new Date(leave_date),
                            id_no: args.id_no,
                            department: args.department,
                            phone: args.phone,
                            address: args.address,
                            blood_group: args.blood_group,
                            image: args.image,
                            status: args.status,
                            designation: {
                                connect: {
                                    id: args.designation_id,
                                },
                            },
                        },
                    });
                    const { password, ...userWithoutPassword } = updateUser;
                    return userWithoutPassword;
                } else {
                    // owner can change only password
                    const hash = await bcrypt.hash(args.password, saltRounds);
                    const updateUser = await prisma.user.update({
                        where: {
                            id: args.id,
                        },
                        data: {
                            password: hash,
                        },
                    });
                    const { password, ...userWithoutPassword } = updateUser;
                    res.json(userWithoutPassword);
                }
            }
        },

        // Delete User
        deleteUser: {
            type: UserType,
            args: {
                id: { type: GraphQLString },
                status: { type: GraphQLBoolean }
            },
            async resolve(parent, args, context) {
                const user = gqlauthorize(context);
                if (!user)
                    return { message: "unauthorized user" }

                if (user.permissions.includes("deleteUser")) {
                    const updatedUser = await prisma.user.update({
                        where: {
                            id: args.id,
                        },
                        data: {
                            status: args.status,
                        },
                    });
                    return { ...updatedUser, message: "OK" };
                }

                else {
                    return { message: "Only admin can delete." }
                }
            },
        },

        // Create a new Product
        createProduct: {
            type: ProductType,
            args: {
                query: { type: GraphQLString },
                name: { type: GraphQLString },
                purchase_price: { type: GraphQLFloat },
                quantity: { type: GraphQLInt },
                sale_price: { type: GraphQLFloat },
                imageName: { type: GraphQLString },
                product_category_id: { type: GraphQLString },
                sku: { type: GraphQLString },
                unit_measurement: { type: GraphQLFloat },
                unit_type: { type: GraphQLString },
                reorder_quantity: { type: GraphQLInt },
                ids: { type: new GraphQLList(GraphQLString) },
                incomeProducts: { type: new GraphQLList(IncomeProductType) }
            },

            async resolve(parent, args) {
                console.log(args);
                if (args.query === "deletemany") {
                    // delete many product at once
                    const deletedProduct = await prisma.product.deleteMany({
                        where: {
                            id: {
                                in: args.ids,
                            },
                        },
                    });

                    return deletedProduct;

                } else if (args.query === "createmany") {
                    // sum all total purchase price
                    const totalPurchasePrice = args.incomeProducts.reduce((acc, cur) => {
                        return acc + cur.quantity * cur.purchase_price;
                    }, 0);

                    // convert incoming data to specific format
                    const data = args.incomeProducts.map((item) => {
                        return {
                            name: item.name,
                            imageName: item.imageName,
                            quantity: parseInt(item.quantity),
                            purchase_price: parseFloat(item.purchase_price),
                            sale_price: parseFloat(item.sale_price),
                            product_category_id: item.product_category_id,
                            sku: item.sku,
                            unit_measurement: parseFloat(item.unit_measurement),
                            unit_type: item.unit_type,
                            reorder_quantity: parseInt(item.reorder_quantity),
                        };
                    });

                    // create many product from an array of object
                    const createdProducts = await prisma.product.createMany({
                        data: data,
                        // skipDuplicates: true,
                    });

                    const subAccounts = await prisma.subAccount.findMany();

                    // stock product's account transaction create
                    await prisma.transaction.create({
                        data: {
                            date: new Date(),
                            debit_id: subAccounts[2].id,
                            credit_id: subAccounts[5].id,
                            amount: totalPurchasePrice,
                            particulars: `Initial stock of ${createdProducts.count} item/s of product`,
                        },
                    });

                    return createdProducts;
                } else {
                    // create one product from an object
                    const createdProduct = await prisma.product.create({
                        data: {
                            name: args.name,
                            quantity: parseInt(args.quantity),
                            purchase_price: parseFloat(args.purchase_price),
                            sale_price: parseFloat(args.sale_price),
                            imageName: args.imageName,
                            product_category: {
                                connect: {
                                    id: args.product_category_id,
                                },
                            },
                            sku: args.sku,
                            unit_measurement: parseFloat(args.unit_measurement),
                            unit_type: args.unit_type,
                            reorder_quantity: parseInt(args.reorder_quantity),
                        },
                    });

                    const subAccounts = await prisma.subAccount.findMany();

                    createdProduct.imageUrl = `${HOST}:${PORT}/${process.env.UPLOAD_PATH}/${args.imageName}`;
                    // stock product's account transaction create
                    await prisma.transaction.create({
                        data: {
                            date: new Date(),
                            debit_id: subAccounts[2].id,
                            credit_id: subAccounts[5].id,
                            amount:
                                parseFloat(args.purchase_price) * parseInt(args.quantity),
                            particulars: `Initial stock of product #${createdProduct.id}`,
                        },
                    });

                    return createdProduct;
                }
            },
        },

        // Update Product
        updateSingleProduct: {
            type: ProductType,
            args: {
                id: { type: GraphQLString },
                name: { type: GraphQLString },
                quantity: { type: GraphQLInt },
                purchase_price: { type: GraphQLFloat },
                sale_price: { type: GraphQLFloat }
            }, async resolve(parent, args) {
                const updatedProduct = await prisma.product.update({
                    where: {
                        id: args.id,
                    },
                    data: {
                        name: args.name,
                        quantity: parseInt(args.quantity),
                        purchase_price: parseFloat(args.purchase_price),
                        sale_price: parseFloat(args.sale_price),
                    },
                });

                return updatedProduct;
            }
        },

        // delete Product
        deleteSingleProduct: {
            type: ProductType,
            args: {
                id: { type: GraphQLString },
                status: { type: GraphQLBoolean }
            }, async resolve(parent, args) {
                const deletedProduct = await prisma.product.update({
                    where: {
                        id: args.id,
                    },
                    data: {
                        status: args.status,
                    },
                });
                return deletedProduct;
            }
        },

        // Create a new Category
        createCategory: {
            type: CategoryType,
            args: {
                name: { type: GraphQLString },
                query: { type: GraphQLString },
                ids: { type: new GraphQLList(GraphQLString) },
                categories: {
                    type: new GraphQLList(GraphQLString)
                }
            },
            async resolve(parent, args) {
                if (args.query === "deletemany") {
                    // delete many product_category at once
                    const deletedProductCategory = await prisma.product_category.deleteMany({
                        where: {
                            id: {
                                in: args.ids,
                            },
                        },
                    });

                    return deletedProductCategory;
                } else if (args.query === "createmany") {
                    // create many product_category from an array of objects
                    const createdProductCategory = await prisma.product_category.createMany({
                        data: args.categories.map((product_category) => {
                            return {
                                name: product_category,
                            };
                        }),
                        // skipDuplicates: true,
                    });

                    return createdProductCategory;
                } else {
                    // create single product_category from an object
                    const createdProductCategory = await prisma.product_category.create({
                        data: {
                            name: args.name,
                        },
                    });

                    return createdProductCategory;
                }
            },
        },
        updateSingleProductCategory: {
            type: CategoryType,
            args: {
                id: { type: GraphQLString },
                name: { type: GraphQLString }
            },
            async resolve(parent, args) {
                const updatedProductCategory = await prisma.product_category.update({
                    where: {
                        id: args.id,
                    },
                    data: {
                        name: args.name,
                    },
                });

                return updatedProductCategory;
            }
        },
        deleteSingleProductCategory: {
            type: CategoryType,
            args: {
                id: { type: GraphQLString }
            },
            async resolve(parent, args) {
                const deletedProductCategory = await prisma.product_category.delete({
                    where: {
                        id: args.id,
                    },
                });

                return deletedProductCategory;
            }
        },

        // Create a new Supplier
        createSingleSupplier: {
            type: SupplierType,
            args: {
                query: { type: GraphQLString },
                name: { type: GraphQLString },
                phone: { type: GraphQLString },
                address: { type: GraphQLString },
                suppliers: { type: new GraphQLList(IncomeSupplierType) },
                ids: { type: new GraphQLList(GraphQLString) }
            },
            async resolve(parent, args) {
                if (args.query === "deletemany") {
                    // delete all suppliers
                    const deletedSupplier = await prisma.supplier.deleteMany({
                        where: {
                            id: {
                                in: args.ids
                            },
                        },
                    });
                    return deletedSupplier;
                } else if (args.query === "createmany") {
                    // create many suppliers from an array of objects
                    const createdSupplier = await prisma.supplier.createMany({
                        data: args.suppliers.map((supplier) => {
                            return {
                                name: supplier.name,
                                phone: supplier.phone,
                                address: supplier.address,
                            };
                        }),
                        // skipDuplicates: true,
                    });
                    return createdSupplier;
                } else {
                    // create a single supplier from an object
                    const createdSupplier = await prisma.supplier.create({
                        data: {
                            name: args.name,
                            phone: args.phone,
                            address: args.address,
                        },
                    });

                    return createdSupplier;
                }
            },
        }, updateSingleSupplier: {
            type: SupplierType,
            args: {
                id: { type: GraphQLString },
                name: { type: GraphQLString },
                phone: { type: GraphQLString },
                address: { type: GraphQLString }
            }, async resolve(parent, args) {
                const updatedSupplier = await prisma.supplier.update({
                    where: {
                        id: args.id,
                    },
                    data: {
                        name: args.name,
                        phone: args.phone,
                        address: args.address,
                    },
                });

                return updatedSupplier;
            }
        }, deleteSingleSupplier: {
            type: SupplierType,
            args: {
                id: { type: GraphQLString },
                status: { type: GraphQLBoolean }
            }, async resolve(parent, args) {
                // delete a single supplier
                const deletedSupplier = await prisma.supplier.update({
                    where: {
                        id: args.id,
                    },
                    data: {
                        status: args.status,
                    },
                });
                return deletedSupplier;
            }
        },

        // Create a single purchase invoice
        createSinglePurchaseInvoice: {
            type: PurchaseInvoiceType,
            args: {
                purchaseInvoiceProduct: { type: new GraphQLList(PurchaseInvoiceProductInputType) },
                date: { type: GraphQLString },
                discount: { type: GraphQLFloat },
                paid_amount: { type: GraphQLFloat },
                supplier_id: { type: GraphQLString },
                note: { type: GraphQLString },
                supplier_memo_no: { type: GraphQLString },
            },
            async resolve(parent, args) {
                // calculate total purchase price
                let totalPurchasePrice = 0;
                args.purchaseInvoiceProduct.forEach((item) => {
                    totalPurchasePrice +=
                        parseFloat(item.product_purchase_price) *
                        parseFloat(item.product_quantity);
                });

                // convert all incoming data to a specific format.
                const date = new Date(args.date).toISOString().split("T")[0];

                // create purchase invoice
                const createdInvoice = await prisma.purchaseInvoice.create({
                    data: {
                        date: new Date(date),
                        total_amount: totalPurchasePrice,
                        discount: parseFloat(args.discount),
                        paid_amount: parseFloat(args.paid_amount),
                        due_amount:
                            totalPurchasePrice -
                            parseFloat(args.discount) -
                            parseFloat(args.paid_amount),
                        supplier: {
                            connect: {
                                id: args.supplier_id,
                            },
                        },
                        note: args.note,
                        supplier_memo_no: args.supplier_memo_no,

                        // map and save all products from request body array of products to database
                        purchaseInvoiceProduct: {
                            create: args.purchaseInvoiceProduct.map((product) => ({
                                product: {
                                    connect: {
                                        id: product.product_id,
                                    },
                                },
                                product_quantity: Number(product.product_quantity),
                                product_purchase_price: parseFloat(product.product_purchase_price),
                            })),
                        },
                    },
                });

                const subAccounts = await prisma.subAccount.findMany();

                // pay on purchase transaction create
                if (args.paid_amount > 0) {
                    await prisma.transaction.create({
                        data: {
                            date: new Date(date),
                            debit_id: subAccounts[2].id,
                            credit_id: subAccounts[0].id,
                            amount: parseFloat(args.paid_amount),
                            particulars: `Cash paid on Purchase Invoice #${createdInvoice.id}`,
                            type: "purchase",
                            related_id: createdInvoice.id,
                        },
                    });
                }

                // if purchase on due then create another transaction
                const due_amount =
                    totalPurchasePrice -
                    parseFloat(args.discount) -
                    parseFloat(args.paid_amount);
                console.log(due_amount);

                if (due_amount > 0) {
                    await prisma.transaction.create({
                        data: {
                            date: new Date(date),
                            debit_id: subAccounts[2].id,
                            credit_id: subAccounts[4].id,
                            amount: due_amount,
                            particulars: `Due on Purchase Invoice #${createdInvoice.id}`,
                            type: "purchase",
                            related_id: createdInvoice.id,
                        },
                    });
                }

                // iterate through all products of this purchase invoice and add product quantity, update product purchase price to database
                args.purchaseInvoiceProduct.forEach(async (item) => {
                    await prisma.product.update({
                        where: {
                            id: item.product_id,
                        },
                        data: {
                            quantity: {
                                increment: Number(item.product_quantity),
                            },
                            purchase_price: {
                                set: parseFloat(item.product_purchase_price),
                            },
                        },
                    });
                })

                return createdInvoice;
            },
        },

        // Create a new Customer
        createCustomer: {
            type: CustomerType,
            args: {
                query: { type: GraphQLString },
                name: { type: GraphQLString },
                phone: { type: GraphQLString },
                address: { type: GraphQLString },
                ids: { type: new GraphQLList(GraphQLString) },
                customers: { type: new GraphQLList(CustomerInputType) }
            },
            async resolve(parent, args) {
                if (args.query === "deletemany") {
                    // delete many customer at once
                    const deletedAccount = await prisma.customer.deleteMany({
                        where: {
                            id: {
                                in: args.ids
                            },
                        },
                    });
                    return deletedAccount;
                } else if (args.query === "createmany") {
                    // create many customer from an array of objects
                    const createdCustomer = await prisma.customer.createMany({
                        data: args.customers.map((customer) => {
                            return {
                                name: customer.name,
                                phone: customer.phone,
                                address: customer.address,
                            };
                        }),
                        // skipDuplicates: true,
                    });
                    return createdCustomer;
                } else {
                    // create single customer from an object
                    const createdCustomer = await prisma.customer.create({
                        data: {
                            name: args.name,
                            phone: args.phone,
                            address: args.address,
                        },
                    });
                    return createdCustomer;
                }
            },
        },

        // update a customer
        updateSingleCustomer: {
            type: CustomerType,
            args: {
                id: { type: GraphQLString },
                name: { type: GraphQLString },
                phone: { type: GraphQLString },
                address: { type: GraphQLString }
            }, async resolve(parent, args) {
                const updatedCustomer = await prisma.customer.update({
                    where: {
                        id: args.id,
                    },
                    data: {
                        name: args.name,
                        phone: args.phone,
                        address: args.address,
                    },
                });

                return updatedCustomer;
            }
        },

        // delete a customer
        deleteCustomer: {
            type: CustomerType,
            args: {
                id: { type: GraphQLString },
                status: { type: GraphQLBoolean }
            }, async resolve(parent, args) {
                const deletedCustomer = await prisma.customer.update({
                    where: {
                        id: args.id,
                    },
                    data: {
                        status: args.status,
                    },
                });
                return deletedCustomer;
            }
        },

        // Update app setting
        updateSetting: {
            type: SettingType,
            args: {
                company_name: { type: GraphQLString },
                tag_line: { type: GraphQLString },
                address: { type: GraphQLString },
                phone: { type: GraphQLString },
                email: { type: GraphQLString },
                website: { type: GraphQLString },
                footer: { type: GraphQLString }
            },
            async resolve(parent, args) {
                const setting = await prisma.appSetting.findFirst();
                const updatedSetting = await prisma.appSetting.update({
                    where: {
                        id: setting.id
                    },
                    data: { ...args },
                });
                return updatedSetting;
            },
        },

        // Create a new Designation
        createDesignation: {
            type: DesignationType,
            args: {
                query: { type: GraphQLString },
                name: { type: GraphQLString },
                designations: { type: new GraphQLList(GraphQLString) },
                ids: { type: new GraphQLList(GraphQLString) }
            },
            async resolve(parent, args) {
                if (args.query === "deletemany") {
                    // delete many designation at once
                    const deletedDesignation = await prisma.designation.deleteMany({
                        where: {
                            id: {
                                in: args.ids,
                            },
                        },
                    });

                    return deletedDesignation;
                } else if (args.query === "createmany") {
                    // create many designation from an array of objects
                    const createdDesignation = await prisma.designation.createMany({
                        data: args.designations.map(designation => {
                            return {
                                name: designation
                            }
                        }),
                        // skipDuplicates: true,
                    });

                    return createdDesignation;
                } else {
                    const createdDesignation = await prisma.designation.create({
                        data: {
                            name: args.name,
                        },
                    });
                    return createdDesignation;
                }
            }
        },

        updateSingleDesignation: {
            type: DesignationType,
            args: {
                id: { type: GraphQLString },
                name: { type: GraphQLString }
            }, async resolve(parent, args) {
                const updatedDesignation = await prisma.designation.update({
                    where: {
                        id: args.id,
                    },
                    data: {
                        name: args.name,
                    },
                });
                return updatedDesignation;
            }
        },

        deleteSingleDesignation: {
            type: DesignationType,
            args: {
                id: { type: GraphQLString }
            }, async resolve(parent, args) {
                const deletedDesignation = await prisma.designation.delete({
                    where: {
                        id: args.id,
                    },
                });
                return deletedDesignation;
            }
        },

        // Create a new role
        createSingleRole: {
            type: RoleType,
            args: {
                query: { type: GraphQLString },
                name: { type: GraphQLString },
                ids: { type: new GraphQLList(GraphQLString) },
                roles: { type: new GraphQLList(GraphQLString) }
            },
            async resolve(parent, args) {
                if (args.query === "deletemany") {
                    const deletedRole = await prisma.role.deleteMany({
                        where: {
                            id: {
                                in: args.ids,
                            },
                        },
                    });
                    return deletedRole;
                } else if (args.query === "createmany") {
                    const createdRole = await prisma.role.createMany({
                        data: args.roles,
                        // skipDuplicates: true,
                    });
                    return createdRole;
                } else {
                    const createdRole = await prisma.role.create({
                        data: {
                            name: args.name,
                        },
                    });
                    return createdRole;
                }
            },
        },

        // Update Role
        updateSingleRole: {
            type: RoleType,
            args: {
                id: { type: GraphQLString },
                name: { type: GraphQLString }
            },
            async resolve(parent, args) {
                const updatedRole = await prisma.role.update({
                    where: {
                        id: args.id,
                    },
                    data: {
                        name: args.name,
                    },
                });

                return updatedRole;
            }
        },

        // Delete Role
        deleteSingleRole: {
            type: RoleType,
            args: {
                id: { type: GraphQLString },
                status: { type: GraphQLBoolean }
            },
            async resolve(parent, args) {
                const deletedRole = await prisma.role.update({
                    where: {
                        id: args.id,
                    },
                    data: {
                        status: args.status,
                    },
                });
                return deletedRole;
            }
        },

        createRolePermission: {
            type: AggregationType,
            args: {
                query: { type: GraphQLString },
                permissionIds: { type: new GraphQLList(GraphQLString) },
                roleId: { type: GraphQLString },
                rolePermissionIds: { type: new GraphQLList(GraphQLString) }
            },
            async resolve(parent, args) {
                if (args.query === "deletemany") {
                    const deletedRolePermission = await prisma.rolePermission.deleteMany({
                        where: {
                            id: {
                                in: args.rolePermissionIds,
                            },
                        },
                    });
                    return {
                        _count: {
                            id: deletedRolePermission.count
                        }
                    }
                } else {
                    // convert all incoming data to a specific format.
                    const data = args.permissionIds.map((permission_id) => {
                        return {
                            role_id: args.roleId,
                            permission_id: permission_id,
                        };
                    });
                    const createdRolePermission = await prisma.rolePermission.createMany({
                        data: data,
                        // skipDuplicates: true,
                    });

                    return {
                        _count: {
                            id: createdRolePermission.count
                        }
                    };
                }
            },
        },
        // Update a role permission
        updateRolePermission: {
            type: RolePermissionType,
            args: {
                id: { type: GraphQLString },
                status: { type: GraphQLBoolean }
            },
            async resolve(parent, args) {
                const updatedRolePermission = await prisma.rolePermission.update({
                    where: {
                        id: args.id
                    },
                    data: {
                        status: args.status
                    }
                });
                return updatedRolePermission;
            },
        },
        // Delete a role permission
        deleteSingleRolePermission: {
            type: RolePermissionType,
            args: {
                id: { type: GraphQLString }
            },
            async resolve(parent, args) {
                const deletedRolePermission = await prisma.rolePermission.delete({
                    where: {
                        id: args.id,
                    },
                });
                return deletedRolePermission;
            }
        },

        // Create a new Account
        createSingleAccount: {
            type: SubAccountType,
            args: {
                account_id: { type: GraphQLString },
                name: { type: GraphQLString }
            },
            async resolve(parent, args) {
                const createdAccount = await prisma.subAccount.create({
                    data: {
                        name: args.name,
                        account: {
                            connect: {
                                id: args.account_id,
                            },
                        },
                    },
                });

                return createdAccount;
            },
        },
        updateSingleAccount: {
            type: AccountType,
            args: {
                id: { type: GraphQLString },
                account_id: { type: GraphQLString },
                name: { type: GraphQLString }
            }, async resolve(parent, args) {
                const updatedAccount = await prisma.subAccount.update({
                    where: {
                        id: args.id,
                    },
                    data: {
                        name: args.name,
                        account: {
                            connect: {
                                id: args.account_id,
                            },
                        },
                    },
                });

                return updatedAccount;
            }
        },

        deleteSingleAccount: {
            type: AccountType,
            args: {
                id: { type: GraphQLString },
                status: { type: GraphQLBoolean }
            }, async resolve(parent, args) {
                const deletedSubAccount = await prisma.subAccount.update({
                    where: {
                        id: args.id,
                    },
                    data: {
                        status: args.status,
                    },
                });
                return deletedSubAccount;
            }
        },

        // Create a new Transaction
        createSingleTransaction: {
            type: TransactionType,
            args: {
                date: { type: GraphQLString },
                debit_id: { type: GraphQLString },
                credit_id: { type: GraphQLString },
                particulars: { type: GraphQLString },
                amount: { type: GraphQLFloat }
            },
            async resolve(parent, args) {
                // convert all incoming data to a specific format.
                const date = new Date(args.date).toISOString().split("T")[0];
                const createdTransaction = await prisma.transaction.create({
                    data: {
                        date: new Date(date),
                        debit: {
                            connect: {
                                id: args.debit_id,
                            },
                        },
                        credit: {
                            connect: {
                                id: args.credit_id,
                            },
                        },
                        particulars: args.particulars,
                        amount: parseFloat(args.amount),
                    },
                });
                return createdTransaction;
            },
        },

        updateSingleTransaction: {
            type: TransactionType,
            args: {
                id: { type: GraphQLString },
                date: { type: GraphQLString },
                particulars: { type: GraphQLString },
                amount: { type: GraphQLFloat }
            }, async resolve(parent, args) {
                // convert all incoming data to a specific format.
                const date = new Date(args.date).toISOString().split("T")[0];
                const updatedTransaction = await prisma.transaction.update({
                    where: {
                        id: args.id,
                    },
                    data: {
                        date: new Date(date),
                        particulars: args.particulars,
                        type: "transaction",
                        related_id: 0,
                        amount: parseFloat(args.amount),
                    },
                });
                // TO DO: update transaction account
                return updatedTransaction;
            }
        },

        deleteSingleTransaction: {
            type: TransactionType,
            args: {
                id: { type: GraphQLString },
                status: { type: GraphQLBoolean }
            }, async resolve(parent, args) {
                const deletedTransaction = await prisma.transaction.update({
                    where: {
                        id: args.id,
                    },
                    data: {
                        status: args.status,
                    },
                });
                return deletedTransaction;
            }
        },

        // Create a single return purchase invoice
        createSingleReturnPurchaseInvoice: {
            type: ReturnPurchaseInvoiceType,
            args: {
                returnPurchaseInvoiceProduct: { type: new GraphQLList(IncomeReturnPurchaseInvoiceProductType) },
                purchaseInvoice_id: { type: GraphQLString },
                date: { type: GraphQLString },
                note: { type: GraphQLString }
            },
            async resolve(parent, args) {
                // calculate total purchase price
                let totalPurchasePrice = 0;
                args.returnPurchaseInvoiceProduct.forEach((item) => {
                    totalPurchasePrice +=
                        parseFloat(item.product_purchase_price) *
                        parseFloat(item.product_quantity);
                });

                // ============ DUE AMOUNT CALCULATION START==============================================
                // get single purchase invoice information with products
                const singlePurchaseInvoice = await prisma.purchaseInvoice.findUnique({
                    where: {
                        id: args.purchaseInvoice_id,
                    },
                });

                const subAccounts = await prisma.subAccount.findMany();

                // transactions of the paid amount
                const transactions2 = await prisma.transaction.findMany({
                    where: {
                        type: "purchase",
                        related_id: args.purchaseInvoice_id,
                        OR: [
                            {
                                credit_id: subAccounts[0].id,
                            },
                            {
                                credit_id: subAccounts[1].id,
                            },
                        ],
                    },
                });
                // transactions of the discount earned amount
                const transactions3 = await prisma.transaction.findMany({
                    where: {
                        type: "purchase",
                        related_id: args.purchaseInvoice_id,
                        credit_id: subAccounts[12].id,
                    },
                });
                // transactions of the return purchase invoice's amount
                const transactions4 = await prisma.transaction.findMany({
                    where: {
                        type: "purchase_return",
                        related_id: args.purchaseInvoice_id,
                        OR: [
                            {
                                debit_id: subAccounts[0].id,
                            },
                            {
                                debit_id: subAccounts[1].id,
                            },
                        ],
                    },
                });
                // get return purchase invoice information with products of this purchase invoice
                const returnPurchaseInvoice = await prisma.returnPurchaseInvoice.findMany({
                    where: {
                        purchaseInvoice_id: args.purchaseInvoice_id,
                    },
                    include: {
                        returnPurchaseInvoiceProduct: {
                            include: {
                                product: true,
                            },
                        },
                    },
                });
                // sum of total paid amount
                const totalPaidAmount = transactions2.reduce(
                    (acc, item) => acc + item.amount,
                    0
                );
                // sum of total discount earned amount
                const totalDiscountAmount = transactions3.reduce(
                    (acc, item) => acc + item.amount,
                    0
                );
                // sum of total return purchase invoice amount
                const paidAmountReturn = transactions4.reduce(
                    (acc, curr) => acc + curr.amount,
                    0
                );
                // sum total amount of all return purchase invoice related to this purchase invoice
                const totalReturnAmount = returnPurchaseInvoice.reduce(
                    (acc, item) => acc + item.total_amount,
                    0
                );
                console.log(singlePurchaseInvoice.total_amount);
                console.log(singlePurchaseInvoice.discount);
                console.log(totalPaidAmount);
                console.log(totalDiscountAmount);
                console.log(totalReturnAmount);
                console.log(paidAmountReturn);
                const dueAmount =
                    singlePurchaseInvoice.total_amount -
                    singlePurchaseInvoice.discount -
                    totalPaidAmount -
                    totalDiscountAmount -
                    totalReturnAmount +
                    paidAmountReturn;
                console.log(dueAmount);
                // ============ DUE AMOUNT CALCULATION END===============================================
                // convert all incoming data to a specific format.
                const date = new Date(args.date).toISOString().split("T")[0];
                // create return purchase invoice
                const createdReturnPurchaseInvoice =
                    await prisma.returnPurchaseInvoice.create({
                        data: {
                            date: new Date(date),
                            total_amount: totalPurchasePrice,
                            purchaseInvoice: {
                                connect: {
                                    id: args.purchaseInvoice_id,
                                },
                            },
                            note: args.note,
                            // map and save all products from request body array of products to database
                            returnPurchaseInvoiceProduct: {
                                create: args.returnPurchaseInvoiceProduct.map((product) => ({
                                    product: {
                                        connect: {
                                            id: product.product_id,
                                        },
                                    },
                                    product_quantity: Number(product.product_quantity),
                                    product_purchase_price: parseFloat(
                                        product.product_purchase_price
                                    ),
                                })),
                            },
                        },
                    });

                // receive payment from supplier on return purchase transaction create
                if (dueAmount >= totalPurchasePrice) {
                    // TODO: dynamic debit id like bank, cash, etc
                    await prisma.transaction.create({
                        data: {
                            date: new Date(date),
                            debit_id: subAccounts[4].id,
                            credit_id: subAccounts[2].id,
                            amount: parseFloat(totalPurchasePrice),
                            particulars: `Account payable (due) reduced on Purchase return invoice #${createdReturnPurchaseInvoice.id} of purchase invoice #${args.purchaseInvoice_id}`,
                            type: "purchase_return",
                            related_id: args.purchaseInvoice_id,
                        },
                    });
                }
                if (dueAmount < totalPurchasePrice) {
                    // TODO: dynamic debit id like bank, cash, etc
                    await prisma.transaction.create({
                        data: {
                            date: new Date(date),
                            debit_id: subAccounts[4].id,
                            credit_id: subAccounts[2].id,
                            amount: parseFloat(dueAmount),
                            particulars: `Account payable (due) reduced on Purchase return invoice #${createdReturnPurchaseInvoice.id} of purchase invoice #${args.purchaseInvoice_id}`,
                            type: "purchase_return",
                            related_id: args.purchaseInvoice_id,
                        },
                    });
                    await prisma.transaction.create({
                        data: {
                            date: new Date(date),
                            debit_id: subAccounts[0].id,
                            credit_id: subAccounts[2].id,
                            amount: parseFloat(totalPurchasePrice - dueAmount),
                            particulars: `Cash receive on Purchase return invoice #${createdReturnPurchaseInvoice.id} of purchase invoice #${args.purchaseInvoice_id}`,
                            type: "purchase_return",
                            related_id: args.purchaseInvoice_id,
                        },
                    });
                }
                // iterate through all products of this return purchase invoice and less the product quantity,
                args.returnPurchaseInvoiceProduct.forEach(async (item) => {
                    await prisma.product.update({
                        where: {
                            id: item.product_id,
                        },
                        data: {
                            quantity: {
                                decrement: Number(item.product_quantity),
                            },
                        },
                    });
                })
                return createdReturnPurchaseInvoice;
            },
        },

        // update
        updateSingleReturnPurchaseInvoice: {
            type: ReturnPurchaseInvoiceType,
            args: {
                id: { type: GraphQLString },
                name: { type: GraphQLString },
                quantity: { type: GraphQLInt },
                purchase_price: { type: GraphQLFloat },
                sale_price: { type: GraphQLFloat },
                note: { type: GraphQLString }
            }, async resolve(parent, args) {
                const updatedProduct = await prisma.returnPurchaseInvoice.update({
                    where: {
                        id: args.id,
                    },
                    data: {
                        name: args.name,
                        quantity: Number(args.quantity),
                        purchase_price: Number(args.purchase_price),
                        sale_price: Number(args.sale_price),
                        note: args.note,
                    },
                });
                return updatedProduct;
            }
        },

        // delete
        deleteSingleReturnPurchaseInvoice: {
            type: ReturnPurchaseInvoiceType,
            args: {
                id: { type: GraphQLString },
                status: { type: GraphQLBoolean },
            },
            async resolve(parent, args) {
                // get purchase invoice details
                const returnPurchaseInvoice = await prisma.returnPurchaseInvoice.findUnique(
                    {
                        where: {
                            id: args.id,
                        },
                        include: {
                            returnPurchaseInvoiceProduct: {
                                include: {
                                    product: true,
                                },
                            }
                        },
                    }
                );
                // product quantity decrease
                returnPurchaseInvoice.returnPurchaseInvoiceProduct.forEach(async (item) => {
                    await prisma.product.update({
                        where: {
                            id: item.product_id,
                        },
                        data: {
                            quantity: {
                                decrement: Number(item.product_quantity),
                            },
                        },
                    });
                });
                // all operations in one transaction
                const [deletePurchaseInvoice, supplier, transaction] =
                    await prisma.$transaction([
                        // purchase invoice delete
                        prisma.returnPurchaseInvoice.update({
                            where: {
                                id: args.id,
                            },
                            data: {
                                status: args.status,
                            },
                        })
                    ]);

                return deletePurchaseInvoice;
            }
        },

        // Create a single return sale invoice
        createSingleReturnSaleInvoice: {
            type: ReturnSaleInvoiceType,
            args: {
                returnSaleInvoiceProduct: { type: new GraphQLList(IncomeReturnSaleInvoiceProductType) },
                saleInvoice_id: { type: GraphQLString },
                date: { type: GraphQLString },
                note: { type: GraphQLString }
            },
            async resolve(parent, args) {
                // calculate total sale price
                let totalSalePrice = 0;
                args.returnSaleInvoiceProduct.forEach((item) => {
                    totalSalePrice +=
                        parseFloat(item.product_sale_price) * parseFloat(item.product_quantity);
                });
                // get all product asynchronously
                const allProduct = await Promise.all(
                    args.returnSaleInvoiceProduct.map(async (item) => {
                        const product = await prisma.product.findUnique({
                            where: {
                                id: item.product_id,
                            },
                        });
                        return product;
                    })
                );
                // iterate over all product and calculate total purchase price
                totalPurchasePrice = 0;
                args.returnSaleInvoiceProduct.forEach((item, index) => {
                    totalPurchasePrice +=
                        allProduct[index].purchase_price * item.product_quantity;
                });

                // ==========================START calculate the due amount of sale invoice ==========================
                // calculate the due before return sale invoice creation
                const singleSaleInvoice = await prisma.saleInvoice.findUnique({
                    where: {
                        id: args.saleInvoice_id,
                    },
                    include: {
                        saleInvoiceProduct: {
                            include: {
                                product: true,
                            },
                        },
                        customer: true,
                        user: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                });
                // transactions of the paid amount
                const transactions2 = await prisma.transaction.findMany({
                    where: {
                        type: "sale",
                        related_id: args.saleInvoice_id,
                        OR: [
                            {
                                debit_id: subAccounts[0].id,
                            },
                            {
                                debit_id: subAccounts[1].id,
                            },
                        ],
                    },
                    include: {
                        debit: {
                            select: {
                                name: true,
                            },
                        },
                        credit: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });
                // transaction of the total return amount
                const returnSaleInvoice = await prisma.returnSaleInvoice.findMany({
                    where: {
                        saleInvoice_id: args.saleInvoice_id,
                    },
                    include: {
                        returnSaleInvoiceProduct: {
                            include: {
                                product: true,
                            },
                        },
                    },
                });
                // calculate the discount given amount at the time of make the payment
                const transactions3 = await prisma.transaction.findMany({
                    where: {
                        type: "sale",
                        related_id: args.saleInvoice_id,
                        debit_id: subAccounts[13].id,
                    },
                    include: {
                        debit: {
                            select: {
                                name: true,
                            },
                        },
                        credit: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });

                const subAccounts = await prisma.subAccount.findMany();

                // calculate the total amount return back to customer for return sale invoice from transactions
                // transactions of the paid amount
                const transactions4 = await prisma.transaction.findMany({
                    where: {
                        type: "sale_return",
                        related_id: args.saleInvoice_id,
                        OR: [
                            {
                                credit_id: subAccounts[0].id,
                            },
                            {
                                credit_id: subAccounts[1].id,
                            },
                        ],
                    },
                    include: {
                        debit: {
                            select: {
                                name: true,
                            },
                        },
                        credit: {
                            select: {
                                name: true,
                            },
                        },
                    },
                });
                const paidAmountReturn = transactions4.reduce(
                    (acc, curr) => acc + curr.amount,
                    0
                );
                console.log("paidAmountReturn", paidAmountReturn);
                // sum total amount of all transactions
                const totalPaidAmount = transactions2.reduce(
                    (acc, item) => acc + item.amount,
                    0
                );
                // sum of total discount given amount at the time of make the payment
                const totalDiscountAmount = transactions3.reduce(
                    (acc, item) => acc + item.amount,
                    0
                );
                // check if total transaction amount is equal to total_amount - discount - return invoice amount
                const totalReturnAmount = returnSaleInvoice.reduce(
                    (acc, item) => acc + item.total_amount,
                    0
                );
                console.log(singleSaleInvoice.total_amount);
                console.log(singleSaleInvoice.discount);
                console.log(totalPaidAmount);
                console.log(totalDiscountAmount);
                console.log(totalReturnAmount);
                const dueAmount =
                    singleSaleInvoice.total_amount -
                    singleSaleInvoice.discount -
                    totalPaidAmount -
                    totalDiscountAmount -
                    totalReturnAmount +
                    paidAmountReturn;
                console.log("dueAmount", dueAmount);
                console.log("totalSalePrice", totalSalePrice);
                // ==========================END calculate the due amount of sale invoice ==========================
                // convert all incoming date to a specific format.
                const date = new Date(args.date).toISOString().split("T")[0];
                // create return sale invoice
                const createdReturnSaleInvoice = await prisma.returnSaleInvoice.create({
                    data: {
                        date: new Date(date),
                        total_amount: totalSalePrice,
                        saleInvoice: {
                            connect: {
                                id: args.saleInvoice_id,
                            },
                        },
                        note: args.note,
                        // map and save all products from request body array of products to database
                        returnSaleInvoiceProduct: {
                            create: args.returnSaleInvoiceProduct.map((product) => ({
                                product: {
                                    connect: {
                                        id: product.product_id,
                                    },
                                },
                                product_quantity: Number(product.product_quantity),
                                product_sale_price: parseFloat(product.product_sale_price),
                            })),
                        },
                    },
                });

                console.log("args.saleInvoice_id", args.saleInvoice_id);
                // return transaction Account Receivable - for due amount
                if (dueAmount >= totalSalePrice) {
                    await prisma.transaction.create({
                        data: {
                            date: new Date(date),
                            debit_id: subAccounts[7].id,
                            credit_id: subAccounts[3].id,
                            amount: parseFloat(totalSalePrice),
                            particulars: `Account Receivable on Sale return invoice #${createdReturnSaleInvoice.id} of sale invoice #${args.saleInvoice_id}`,
                            type: "sale_return",
                            related_id: args.saleInvoice_id
                        },
                    });
                }
                // dueAmount is less than total Accounts Receivable - for cash amount
                // two transaction will be created for cash and due adjustment
                // TODO: dynamic credit id like bank, cash, etc
                if (dueAmount < totalSalePrice) {
                    await prisma.transaction.create({
                        data: {
                            date: new Date(date),
                            debit_id: subAccounts[7].id,
                            credit_id: subAccounts[3].id,
                            amount: parseFloat(dueAmount),
                            particulars: `Account Receivable on Sale return invoice #${createdReturnSaleInvoice.id} of sale invoice #${args.saleInvoice_id}`,
                            type: "sale_return",
                            related_id: args.saleInvoice_id,
                        },
                    });
                    await prisma.transaction.create({
                        data: {
                            date: new Date(date),
                            debit_id: subAccounts[7].id,
                            credit_id: subAccounts[0].id,
                            amount: parseFloat(totalSalePrice - dueAmount),
                            particulars: `Cash paid on Sale return invoice #${createdReturnSaleInvoice.id} of sale invoice #${args.saleInvoice_id}`,
                            type: "sale_return",
                            related_id: args.saleInvoice_id
                        },
                    });
                }
                // goods received on return sale transaction create
                await prisma.transaction.create({
                    data: {
                        date: new Date(date),
                        debit_id: subAccounts[2].id,
                        credit_id: subAccounts[8].id,
                        amount: parseFloat(totalPurchasePrice),
                        particulars: `Cost of sales reduce on Sale return Invoice #${createdReturnSaleInvoice.id} of sale invoice #${args.saleInvoice_id}`,
                        type: "sale_return",
                        related_id: args.saleInvoice_id,
                    },
                });
                // iterate through all products of this return sale invoice and increase the product quantity,
                args.returnSaleInvoiceProduct.forEach(async (item) => {
                    await prisma.product.update({
                        where: {
                            id: item.product_id,
                        },
                        data: {
                            quantity: {
                                increment: Number(item.product_quantity),
                            },
                        },
                    });
                });
                // decrease sale invoice profit by return sale invoice's calculated profit profit
                const returnSaleInvoiceProfit = totalSalePrice - totalPurchasePrice;
                await prisma.saleInvoice.update({
                    where: {
                        id: args.saleInvoice_id,
                    },
                    data: {
                        profit: {
                            decrement: returnSaleInvoiceProfit,
                        },
                    },
                });

                return createdReturnSaleInvoice;
            },
        },

        deleteSingleReturnSaleInvoice: {
            type: ReturnSaleInvoiceType,
            args: {
                id: { type: GraphQLString },
                status: { type: GraphQLBoolean }
            }, async resolve(parent, args) {
                // get purchase invoice details
                const returnSaleInvoice = await prisma.returnSaleInvoice.findUnique({
                    where: {
                        id: args.id
                    },
                    include: {
                        returnSaleInvoiceProduct: {
                            include: {
                                product: true,
                            },
                        }
                    },
                });
                // product quantity decrease
                returnSaleInvoice.returnSaleInvoiceProduct.forEach(async (item) => {
                    await prisma.product.update({
                        where: {
                            id: item.product_id
                        },
                        data: {
                            quantity: {
                                decrement: Number(item.product_quantity),
                            },
                        },
                    });
                });
                // all operations in one transaction
                const [deleteSaleInvoice] =
                    await prisma.$transaction([
                        // purchase invoice delete
                        prisma.returnSaleInvoice.update({
                            where: {
                                id: args.id
                            },
                            data: {
                                status: args.status,
                            },
                        })
                    ]);
                return deleteSaleInvoice;
            }
        },

        // Create a new payment purchase invoice
        createPaymentPurchaseInvoice: {
            type: CompletedTransactionType,
            args: {
                date: { type: GraphQLString },
                amount: { type: GraphQLFloat },
                purchase_invoice_no: { type: GraphQLString },
                discount: { type: GraphQLFloat }
            },
            async resolve(parent, args) {
                // convert all incoming data to a specific format.
                const date = new Date(args.date).toISOString().split("T")[0];
                // paid amount against purchase invoice using a transaction
                const subAccounts = await prisma.subAccount.findMany();
                const transaction1 = await prisma.transaction.create({
                    data: {
                        date: new Date(date),
                        debit_id: subAccounts[4].id,
                        credit_id: subAccounts[0].id,
                        amount: parseFloat(args.amount),
                        particulars: `Due pay of Purchase Invoice #${args.purchase_invoice_no}`,
                        type: "purchase",
                        related_id: args.purchase_invoice_no
                    },
                });
                // discount earned using a transaction
                let transaction2;
                if (args.discount > 0) {
                    transaction2 = await prisma.transaction.create({
                        data: {
                            date: new Date(date),
                            debit_id: subAccounts[4].id,
                            credit_id: subAccounts[12].id,
                            amount: parseFloat(args.discount),
                            particulars: `Discount earned of Purchase Invoice #${args.purchase_invoice_no}`,
                            type: "purchase",
                            related_id: args.purchase_invoice_no
                        },
                    });
                }
                return { transaction1, transaction2 };
            },
        },

        // Create a new payment sale invoice
        createSinglePaymentSaleInvoice: {
            type: CompletedTransactionType,
            args: {
                date: { type: GraphQLString },
                amount: { type: GraphQLFloat },
                sale_invoice_no: { type: GraphQLString },
                discount: { type: GraphQLFloat }
            },
            async resolve(parent, args) {
                // convert all incoming data to a specific format.
                const date = new Date(args.date).toISOString().split("T")[0];
                // received paid amount against sale invoice using a transaction
                const subAccounts = await prisma.subAccount.findMany();
                const transaction1 = await prisma.transaction.create({
                    data: {
                        date: new Date(date),
                        debit_id: subAccounts[0].id,
                        credit_id: subAccounts[3].id,
                        amount: parseFloat(args.amount),
                        particulars: `Received payment of Sale Invoice #${args.sale_invoice_no}`,
                        type: "sale",
                        related_id: args.sale_invoice_no
                    },
                });
                // discount given using a transaction
                let transaction2;
                if (args.discount > 0) {
                    transaction2 = await prisma.transaction.create({
                        data: {
                            date: new Date(date),
                            debit_id: subAccounts[13].id,
                            credit_id: subAccounts[3].id,
                            amount: parseFloat(args.discount),
                            particulars: `Discount given of Sale Invoice #${args.sale_invoice_no}`,
                            type: "sale",
                            related_id: args.sale_invoice_no
                        },
                    });
                }
                // decrease sale invoice profit by discount value
                const saleInvoice = await prisma.saleInvoice.update({
                    where: {
                        id: args.sale_invoice_no
                    },
                    data: {
                        profit: {
                            decrement: parseFloat(args.discount),
                        },
                    },
                });

                return { transaction1, transaction2 };
            },
        },

        // Create a new sale invoice
        createSingleSaleInvoice: {
            type: SingleSaleInvoiceType,
            args: {
                saleInvoiceProduct: { type: new GraphQLList(IncomeSaleInvoiceProductType) },
                date: { type: GraphQLString },
                discount: { type: GraphQLFloat },
                paid_amount: { type: GraphQLFloat },
                customer_id: { type: GraphQLString },
                user_id: { type: GraphQLString },
                note: { type: GraphQLString },
            },
            async resolve(parent, args) {
                // calculate total sale price
                let totalSalePrice = 0;
                args.saleInvoiceProduct.forEach((item) => {
                    totalSalePrice +=
                        parseFloat(item.product_sale_price) * parseFloat(item.product_quantity);
                });
                // get all product asynchronously
                const allProduct = await Promise.all(
                    args.saleInvoiceProduct.map(async (item) => {
                        const product = await prisma.product.findUnique({
                            where: {
                                id: item.product_id,
                            },
                        });
                        return product;
                    })
                );
                // iterate over all product and calculate total purchase price
                totalPurchasePrice = 0;
                args.saleInvoiceProduct.forEach((item, index) => {
                    totalPurchasePrice +=
                        allProduct[index].purchase_price * item.product_quantity;
                });
                // convert all incoming date to a specific format.
                const date = new Date(args.date).toISOString().split("T")[0];
                // create sale invoice
                const createdInvoice = await prisma.saleInvoice.create({
                    data: {
                        date: new Date(date),
                        total_amount: totalSalePrice,
                        discount: parseFloat(args.discount),
                        paid_amount: parseFloat(args.paid_amount),
                        profit:
                            totalSalePrice - parseFloat(args.discount) - totalPurchasePrice,
                        due_amount:
                            totalSalePrice -
                            parseFloat(args.discount) -
                            parseFloat(args.paid_amount),
                        customer: {
                            connect: {
                                id: args.customer_id
                            },
                        },
                        user: {
                            connect: {
                                id: args.user_id
                            },
                        },
                        note: args.note,
                        // map and save all products from request body array of products
                        saleInvoiceProduct: {
                            create: args.saleInvoiceProduct.map((product) => ({
                                product: {
                                    connect: {
                                        id: product.product_id
                                    },
                                },
                                product_quantity: Number(product.product_quantity),
                                product_sale_price: parseFloat(product.product_sale_price),
                            })),
                        },
                    },
                });

                const subAccounts = await prisma.subAccount.findMany();

                // new transactions will be created as journal entry for paid amount
                if (args.paid_amount > 0) {
                    await prisma.transaction.create({
                        data: {
                            date: new Date(date),
                            debit_id: subAccounts[0].id,
                            credit_id: subAccounts[7].id,
                            amount: parseFloat(args.paid_amount),
                            particulars: `Cash receive on Sale Invoice #${createdInvoice.id}`,
                            type: "sale",
                            related_id: createdInvoice.id,
                        },
                    });
                }
                // if sale on due another transactions will be created as journal entry
                const due_amount =
                    totalSalePrice -
                    parseFloat(args.discount) -
                    parseFloat(args.paid_amount);
                // console.log(due_amount);
                if (due_amount > 0) {
                    await prisma.transaction.create({
                        data: {
                            date: new Date(date),
                            debit_id: subAccounts[3].id,
                            credit_id: subAccounts[7].id,
                            amount: due_amount,
                            particulars: `Due on Sale Invoice #${createdInvoice.id}`,
                            type: "sale",
                            related_id: createdInvoice.id,
                        },
                    });
                }
                // cost of sales will be created as journal entry
                await prisma.transaction.create({
                    data: {
                        date: new Date(date),
                        debit_id: subAccounts[8].id,
                        credit_id: subAccounts[2].id,
                        amount: totalPurchasePrice,
                        particulars: `Cost of sales on Sale Invoice #${createdInvoice.id}`,
                        type: "sale",
                        related_id: createdInvoice.id,
                    },
                });
                // iterate through all products of this sale invoice and decrease product quantity
                args.saleInvoiceProduct.forEach(async (item) => {
                    await prisma.product.update({
                        where: {
                            id: item.product_id
                        },
                        data: {
                            quantity: {
                                decrement: Number(item.product_quantity),
                            },
                        },
                    });
                })

                return createdInvoice;
            },
        },

        createPaymentType: {
            type: PaymentType,
            args: {
                name: { type: GraphQLString }
            },
            async resolve(parent, args) {
                const createdPaymentType = await prisma.paymentType.create({
                    data: {
                        name: args.name
                    },
                });
                return createdPaymentType;
            }
        },

        updatePaymentType: {
            type: PaymentType,
            args: {
                id: { type: GraphQLString },
                name: { type: GraphQLString }
            },
            async resolve(parent, args) {
                const updatedPaymentType = await prisma.paymentType.update({
                    where: {
                        id: args.id
                    },
                    data: {
                        name: args.name
                    },
                });
                return updatedPaymentType;
            }
        }
    },
});


module.exports = new GraphQLSchema({
    query: RootQuery,
    mutation: Mutation,
});
