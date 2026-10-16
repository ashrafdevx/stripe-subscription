function formatPrice(product) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: product.currency.toUpperCase(),
  }).format(product.amount / 100);
}

function ProductDetail({ product, onBack, onPay, isLoading, children }) {
  const image = product.images?.[0];

  return (
    <section className="mx-auto w-full max-w-[640px] rounded-[10px] border border-border bg-white p-[18px] shadow-card sm:p-[clamp(22px,4vw,36px)]">
      <button className="cursor-pointer border-0 bg-transparent px-0 py-1 text-xs font-semibold text-accent hover:text-accent-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[rgb(105_148_128_/_48%)]" type="button" onClick={onBack}>← Back to products</button>
      {image && <img className="my-[17px] mb-[25px] block max-h-[340px] w-full rounded-md bg-[#eff2ec] object-cover" src={image} alt={product.name} />}
      <span className="text-[9px] font-bold uppercase tracking-[1.25px] text-[#6e897c]">{product.source === 'stripe' ? 'Stripe product' : 'Store item'}</span>
      <h1 className="m-0 mt-2.5 font-serif text-[36px] font-normal leading-[1.12] tracking-[-1.5px] text-ink min-[521px]:text-[clamp(34px,5vw,46px)]" id="product-title">{product.name}</h1>
      {product.description && <p className="mb-[18px] mt-3.5 max-w-[390px] text-sm leading-[1.8] text-[#727e77]">{product.description}</p>}
      {product.details?.length > 0 && (
        <div className="mb-7 flex flex-wrap gap-[9px]">
          {product.details.map((detail) => <span className="rounded-full border border-border bg-[#fafbf8] px-[10px] py-[7px] text-[11px] text-[#65736d]" key={detail}>{detail}</span>)}
        </div>
      )}
      <div className="mt-5 flex items-baseline gap-[11px] border-t border-[#e9ede6] pt-5">
        <span className="text-[22px] font-semibold tracking-[-0.5px] text-ink">{formatPrice(product)}</span>
        <span className="text-[11px] text-muted">One-time payment</span>
      </div>
      {!children && (
        <button className="mt-[17px] flex min-h-[54px] w-full items-center justify-between rounded-md border-0 bg-accent px-5 text-[13px] font-semibold text-white shadow-[0_5px_12px_rgb(49_91_80_/_12%)] transition hover:-translate-y-px hover:bg-accent-hover hover:shadow-[0_8px_17px_rgb(49_91_80_/_18%)] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[rgb(105_148_128_/_48%)] disabled:cursor-wait disabled:opacity-70" type="button" onClick={onPay} disabled={isLoading}>
          {isLoading ? 'Preparing secure payment…' : `Continue · ${formatPrice(product)}`}
          {!isLoading && <span aria-hidden="true">→</span>}
        </button>
      )}
      {children}
    </section>
  );
}

export default ProductDetail;
