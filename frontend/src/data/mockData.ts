import { nanoid } from 'nanoid/non-secure';

export const mockKpis = [
  {
    title: 'GMV Today',
    value: '$1.28M',
    delta: '+18%',
    trend: 'up'
  },
  {
    title: 'Fill Rate',
    value: '94.2%',
    delta: '+2.4 pts',
    trend: 'up'
  },
  {
    title: 'Returns',
    value: '2.1%',
    delta: '-0.5 pts',
    trend: 'down'
  },
  {
    title: 'Credit Exposure',
    value: '$4.7M',
    delta: '+$120k',
    trend: 'up'
  }
];

export const mockOrders = Array.from({ length: 8 }).map((_, index) => ({
  id: `ORD-${2310 + index}`,
  distributor: index % 2 === 0 ? 'Alpha Distributors' : 'Nova FMCG',
  retailer: index % 3 === 0 ? 'Retail Mart' : 'QuickShop',
  amount: 12000 + index * 1500,
  status: ['submitted', 'approved', 'dispatched', 'delivered'][index % 4],
  eta: '4h',
  scheme: index % 2 === 0 ? 'Festive Push' : 'Volume Booster'
}));

export const mockInventory = [
  {
    id: 1,
    sku: 'BIS-500',
    name: 'Biscuit Twin Pack',
    warehouse: 'Mumbai DC',
    stock: 4200,
    reserved: 700,
    coverageDays: 9
  },
  {
    id: 2,
    sku: 'SHMP-250',
    name: 'Herbal Shampoo 250ml',
    warehouse: 'Bengaluru DC',
    stock: 860,
    reserved: 120,
    coverageDays: 4
  },
  {
    id: 3,
    sku: 'DET-2KG',
    name: 'Detergent 2kg',
    warehouse: 'Delhi DC',
    stock: 2150,
    reserved: 340,
    coverageDays: 6
  }
];

export const mockCreditLedger = [
  {
    id: nanoid(6),
    distributor: 'Alpha Distributors',
    outstanding: '$320K',
    limit: '$500K',
    aging: '22 days'
  },
  {
    id: nanoid(6),
    distributor: 'Nova FMCG',
    outstanding: '$180K',
    limit: '$250K',
    aging: '14 days'
  },
  {
    id: nanoid(6),
    distributor: 'Orbit Retail',
    outstanding: '$90K',
    limit: '$150K',
    aging: '31 days'
  }
];

export const mockSchemes = [
  {
    id: nanoid(5),
    name: 'Festive Growth Pack',
    type: 'Volume',
    progress: 72,
    budget: '$180K',
    validity: 'Sep 1 - Oct 30',
    tier: 'Distributor + Retailer'
  },
  {
    id: nanoid(5),
    name: 'Beat Blitz Cashback',
    type: 'Route',
    progress: 46,
    budget: '$90K',
    validity: 'Aug 15 - Sep 10',
    tier: 'Field Teams'
  },
  {
    id: nanoid(5),
    name: 'New Outlet Sprint',
    type: 'Activation',
    progress: 58,
    budget: '$120K',
    validity: 'Q4 FY25',
    tier: 'Distributor'
  }
];

export const mockVisits = [
  {
    id: nanoid(4),
    rep: 'Anita Rao',
    route: 'South Mumbai',
    retailers: 18,
    status: 'On Track',
    coverage: '92%'
  },
  {
    id: nanoid(4),
    rep: 'Vinay Menon',
    route: 'Whitefield',
    retailers: 14,
    status: 'Delayed',
    coverage: '68%'
  },
  {
    id: nanoid(4),
    rep: 'Sara Khan',
    route: 'Noida Sector 70',
    retailers: 21,
    status: 'Ahead',
    coverage: '105%'
  }
];
