// netlify/functions/create-checkout.js
// Cria uma Stripe Checkout Session com split 30/70 entre a tua conta e a conta da Lilix (Connect Express)

const Stripe = require('stripe');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

    // ─────── PRICING & SPLIT ───────
    // Cliente paga preço com IVA. O IVA fica contigo para pagares ao Estado.
    // Split 30/70 sobre a receita líquida (€60 − Stripe fee), partilhando custos.
    const PRICE_NET   = 6000;   // €60,00 — preço sem IVA
    const IVA_CENTS   = 1380;   // €13,80 — 23% sobre €60
    const PRICE_GROSS = PRICE_NET + IVA_CENTS; // €73,80 — total cobrado ao cliente

    // Stripe fee assumida (cartão UE: 1,4% + €0,25 sobre €73,80)
    const STRIPE_FEE_EST = Math.round(PRICE_GROSS * 0.014 + 25); // ~128 cents = €1,28
    const NET_TO_SPLIT   = PRICE_NET - STRIPE_FEE_EST;           // €58,72

    const LILIX_SHARE = Math.round(NET_TO_SPLIT * 0.70); // €41,10 (70% líquido)
    const YOUR_SHARE  = NET_TO_SPLIT - LILIX_SHARE;      // €17,62 (30% líquido)

    // Application fee = o que fica contigo = tua margem + IVA + Stripe fee
    const APP_FEE     = PRICE_GROSS - LILIX_SHARE;       // €32,70

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: PRICE_GROSS,
          product_data: {
            name: 'ItsXliLix — Constrói o teu income online',
            description: 'Manual prático · 12 módulos · Acesso vitalício · Preço com IVA incluído',
          },
        },
        quantity: 1,
      }],
      payment_intent_data: {
        application_fee_amount: APP_FEE,
        transfer_data: {
          destination: process.env.LILIX_STRIPE_ACCOUNT_ID,
        },
        description: 'ItsXliLix manual · IVA 23% incluído · Split 30/70 sobre líquido',
      },
      customer_creation: 'always',
      billing_address_collection: 'auto',
      success_url: `${process.env.DOMAIN}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.DOMAIN}/`,
      allow_promotion_codes: false,
      metadata: {
        product: 'itsxlilix_manual_v1',
      },
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url, id: session.id }),
    };
  } catch (err) {
    console.error('Stripe error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
