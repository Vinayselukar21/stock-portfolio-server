type StockSymbol = {
    google: string;
    yahoo: string;
};



type PortfolioStock = {
    id: string;
    sector: string;
    symbol: StockSymbol;
    name: string;
    purchasePrice: number;
    quantity: number;
    investment: number;
    portfolioPercentage: string;
};

export const portfolioStocks: PortfolioStock[] = [
    {
        id: "hdfcbank",
        sector: "Financial Sector",
        symbol: {
            google: "HDFCBANK:NSE",
            yahoo: "HDFCBANK.NS"
        },
        name: "HDFC Bank",

        purchasePrice: 1490,
        quantity: 50,
        investment: 74500,
        portfolioPercentage: "5"

    },
    {
        id: "bajfinance",
        sector: "Financial Sector",
        symbol: {
            google: "BAJFINANCE:NSE",
            yahoo: "BAJFINANCE.NS"
        },
        name: "Bajaj Finance",

        purchasePrice: 6466,
        quantity: 15,
        investment: 96990,
        portfolioPercentage: "6"

    },
    {
        id: "icicibank",
        sector: "Financial Sector",
        symbol: {
            google: "ICICIBANK:NSE",
            yahoo: "ICICIBANK.NS"
        },
        name: "ICICI Bank",

        purchasePrice: 780,
        quantity: 84,
        investment: 65520,
        portfolioPercentage: "4"

    },
    {
        id: "bajajhfl",
        sector: "Financial Sector",
        symbol: {
            google: "BAJAJHFL:NSE",
            yahoo: "BAJAJHFL.NS"
        },
        name: "Bajaj Housing Finance",

        purchasePrice: 130,
        quantity: 504,
        investment: 65520,
        portfolioPercentage: "4"

    },
    {
        id: "savfin",
        sector: "Financial Sector",
        symbol: {
            google: "511577:BOM",
            yahoo: "SAVFI.BO"
        },
        name: "Savani Financials Ltd",

        purchasePrice: 24,
        quantity: 1080,
        investment: 25920,
        portfolioPercentage: "2"

    },
    {
        id: "affle",
        sector: "Tech Sector",
        symbol: {
            google: "AFFLE:NSE",
            yahoo: "AFFLE.NS"
        },
        name: "Affle India",

        purchasePrice: 1151,
        quantity: 50,
        investment: 57550,
        portfolioPercentage: "4"

    },
    {
        id: "ltimindtree",
        sector: "Tech Sector",
        symbol: {
            google: "LTIM:NSE",
            yahoo: "LTIM.NS"
        },
        name: "LTI Mindtree",

        purchasePrice: 4775,
        quantity: 16,
        investment: 76400,
        portfolioPercentage: "5"

    },
    {
        id: "kpittech",
        sector: "Tech Sector",
        symbol: {
            google: "KPITTECH:NSE",
            yahoo: "KPITTECH.NS"
        },
        name: "KPIT Tech",

        purchasePrice: 672,
        quantity: 61,
        investment: 40992,
        portfolioPercentage: "3"

    },
    {
        id: "tatatech",
        sector: "Tech Sector",
        symbol: {
            google: "TATATECH:NSE",
            yahoo: "TATATECH.NS"
        },
        name: "Tata Tech",

        purchasePrice: 1072,
        quantity: 63,
        investment: 67536,
        portfolioPercentage: "4"

    },
    {
        id: "blse",
        sector: "Tech Sector",
        symbol: {
            google: "BLSE:NSE",
            yahoo: "BLSE.NS"
        },
        name: "BLS E-Services Ltd",

        purchasePrice: 232,
        quantity: 191,
        investment: 44312,
        portfolioPercentage: "3"

    },
    {
        id: "tanla",
        sector: "Tech Sector",
        symbol: {
            google: "TANLA:NSE",
            yahoo: "TANLA.NS"
        },
        name: "Tanla Platforms",

        purchasePrice: 1134,
        quantity: 45,
        investment: 51030,
        portfolioPercentage: "3"

    },
    {
        id: "dmart",
        sector: "Consumer",
        symbol: {
            google: "DMART:NSE",
            yahoo: "DMART.NS"
        },
        name: "Avenue Supermarts (Dmart)",

        purchasePrice: 3777,
        quantity: 27,
        investment: 101979,
        portfolioPercentage: "7"

    },
    {
        id: "tataconsum",
        sector: "Consumer",
        symbol: {
            google: "TATACONSUM:NSE",
            yahoo: "TATACONSUM.NS"
        },
        name: "Tata Consumer",

        purchasePrice: 845,
        quantity: 90,
        investment: 76050,
        portfolioPercentage: "5"

    },
    {
        id: "pidilite",
        sector: "Consumer",
        symbol: {
            google: "PIDILITIND:NSE",
            yahoo: "PIDILITIND.NS"
        },
        name: "Pidilite Industries",

        purchasePrice: 2376,
        quantity: 36,
        investment: 85536,
        portfolioPercentage: "6"

    },
    {
        id: "tatapower",
        sector: "Power",
        symbol: {
            google: "TATAPOWER:NSE",
            yahoo: "TATAPOWER.NS"
        },
        name: "Tata Power",

        purchasePrice: 224,
        quantity: 225,
        investment: 50400,
        portfolioPercentage: "3"

    },
    {
        id: "kpigreen",
        sector: "Power",
        symbol: {
            google: "KPIGREEN:NSE",
            yahoo: "KPIGREEN.NS"
        },
        name: "KPI Green Energy Ltd",

        purchasePrice: 875,
        quantity: 50,
        investment: 43750,
        portfolioPercentage: "3"

    },
    {
        id: "suzlon",
        sector: "Power",
        symbol: {
            google: "SUZLON:NSE",
            yahoo: "SUZLON.NS"
        },
        name: "Suzlon",

        purchasePrice: 44,
        quantity: 450,
        investment: 19800,
        portfolioPercentage: "1"

    },
    {
        id: "gensol",
        sector: "Power",
        symbol: {
            google: "GENSOL:NSE",
            yahoo: "GENSOL.NS"
        },
        name: "Gensol Engineering",

        purchasePrice: 998,
        quantity: 45,
        investment: 44910,
        portfolioPercentage: "3"

    },
    {
        id: "hariompipe",
        sector: "Pipe Sector",
        symbol: {
            google: "HARIOMPIPE:NSE",
            yahoo: "HARIOMPIPE.NS"
        },
        name: "Hariom Pipe Industries Ltd",

        purchasePrice: 580,
        quantity: 60,
        investment: 34800,
        portfolioPercentage: "2"

    },
    {
        id: "astral",
        sector: "Pipe Sector",
        symbol: {
            google: "ASTRAL:NSE",
            yahoo: "ASTRAL.NS"
        },
        name: "Astral Ltd.",

        purchasePrice: 1517,
        quantity: 56,
        investment: 84952,
        portfolioPercentage: "6"

    },
    {
        id: "polycab",
        sector: "Pipe Sector",
        symbol: {
            google: "POLYCAB:NSE",
            yahoo: "POLYCAB.NS"
        },
        name: "Polycab India",

        purchasePrice: 2818,
        quantity: 28,
        investment: 78904,
        portfolioPercentage: "5"

    },
    {
        id: "cleansci",
        sector: "Others",
        symbol: {
            google: "CLEAN:NSE",
            yahoo: "CLEAN.NS"
        },
        name: "Clean Science and Technology Ltd",

        purchasePrice: 1610,
        quantity: 32,
        investment: 51520,
        portfolioPercentage: "3"

    },
    {
        id: "deepakntr",
        sector: "Others",
        symbol: {
            google: "DEEPAKNTR:NSE",
            yahoo: "DEEPAKNTR.NS"
        },
        name: "Deepak Nitrite",

        purchasePrice: 2248,
        quantity: 27,
        investment: 60696,
        portfolioPercentage: "4"

    },
    {
        id: "fineorg",
        sector: "Others",
        symbol: {
            google: "FINEORG:NSE",
            yahoo: "FINEORG.NS"
        },
        name: "Fine Organic",

        purchasePrice: 4284,
        quantity: 16,
        investment: 68544,
        portfolioPercentage: "4"

    },
    {
        id: "gravita",
        sector: "Others",
        symbol: {
            google: "GRAVITA:NSE",
            yahoo: "GRAVITA.NS"
        },
        name: "Gravita",

        purchasePrice: 2037,
        quantity: 8,
        investment: 16296,
        portfolioPercentage: "1"

    },
    {
        id: "sbilife",
        sector: "Others",
        symbol: {
            google: "SBILIFE:NSE",
            yahoo: "SBILIFE.NS"
        },
        name: "SBI Life Insurance",

        purchasePrice: 1197,
        quantity: 49,
        investment: 58653,
        portfolioPercentage: "4"

    }
];