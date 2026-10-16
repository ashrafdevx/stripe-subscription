function formatPrice(product) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: product.currency.toUpperCase(),
  }).format(product.amount / 100);
}

function ProductList({ products, onSelect, loading, error }) {
  if (loading) {
    return <p className="mt-3 text-center text-[10px] text-muted">Loading products…</p>;
  }

  if (error) {
    return <p className="mt-3.5 rounded-md border border-[#f0d8d3] bg-[#faece9] px-3 py-[11px] text-xs leading-5 text-[#8b352d]" role="alert">{error}</p>;
  }

  if (!products.length) {
    return <p className="mt-3 text-center text-[10px] text-muted">No products to show yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-[15px] min-[521px]:grid-cols-2 min-[521px]:gap-4 min-[901px]:grid-cols-3 min-[901px]:gap-6">
      {products.map((product) => (
        <article className="flex min-w-0 flex-col overflow-hidden rounded-[9px] border border-border bg-surface shadow-[0_3px_12px_rgb(37_54_45_/_3%)] transition duration-200 hover:-translate-y-[3px] hover:border-[#d4ded4] hover:shadow-card-hover" key={`${product.source}-${product.priceId || product.id}`}>
          {product.images?.[0] ? (
            <img className="block aspect-[1.7] w-full bg-[#eff2ec] object-cover sm:aspect-[1.48]" src={product.images[0]} alt="" />
          ) : (
            <div className="grid aspect-[1.7] w-full place-items-center bg-[radial-gradient(circle_at_76%_22%,#e6d4ae_0_10%,transparent_10.5%),linear-gradient(145deg,#c4d1c4,#78948a)] font-serif text-[58px] text-white/90 sm:aspect-[1.48]" aria-hidden="true">S</div>
          )}
          <div className="flex flex-1 flex-col p-4 sm:p-5">
            <span className="text-[9px] font-bold uppercase tracking-[1.25px] text-[#6e897c]">{product.source === 'stripe' ? 'Stripe product' : 'Store item'}</span>
            <h2 className="mb-2 mt-[9px] font-serif text-[19px] font-normal tracking-[-0.35px] text-ink sm:text-[21px]">{product.name}</h2>
            <p className="mb-0 min-h-0 text-xs leading-[1.75] text-[#77827c] sm:min-h-[42px]">{product.description}</p>
            <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#edf0e9] pt-4 max-[760px]:flex-col max-[760px]:items-stretch">
              <strong className="text-base tracking-[-0.2px] text-ink">{formatPrice(product)}</strong>
              <button className="min-h-9 cursor-pointer rounded-md border border-accent bg-accent px-[13px] text-xs font-semibold text-white transition hover:border-accent-hover hover:bg-accent-hover active:translate-y-px max-[760px]:w-full" type="button" onClick={() => onSelect(product)}>View item</button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export default ProductList;
