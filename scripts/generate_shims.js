const fs = require('fs');

const classes = `
-translate-y-1/2
absolute
bg-amber-50
bg-blue-50
bg-blue-500
bg-gray-100
bg-gray-50
bg-green-50
bg-green-500
bg-red-50
bg-slate-100
bg-slate-50
bg-white
block
border
border-0
border-2
border-amber-200
border-b
border-blue-200
border-blue-300
border-dashed
border-gray-100
border-gray-200
border-gray-50
border-green-100
border-none
border-orange-200
border-red-100
border-slate-200
border-t
cursor-pointer
flex
flex-1
flex-col
flex-wrap
h-1.5
h-12
h-16
h-2
h-8
h-full
h-px
hidden
inline-block
items-center
items-start
justify-between
justify-center
justify-end
leading-none
max-w-2xl
max-w-7xl
max-w-lg
max-w-md
max-w-sm
mb-0
mb-0.5
mb-1
mb-1.5
mb-2
mb-3
mb-4
mb-5
mb-6
mb-8
min-h-[180px]
min-h-[250px]
min-h-[500px]
min-w-[140px]
min-w-[260px]
ml-2
mr-1.5
mt-0.5
mt-1
mt-1.5
mt-2
mt-3
mt-4
mt-6
mt-8
mt-auto
mx-2
mx-auto
my-4
object-contain
opacity-0
opacity-50
opacity-70
opacity-80
overflow-auto
overflow-hidden
overflow-x-auto
overflow-y-auto
p-0
p-1
p-1.5
p-2
p-3
p-4
p-5
p-6
p-8
pb-0
pb-12
pb-2
pb-4
pb-6
pl-0
pl-9
pointer-events-none
pr-2
pr-8
pt-1
pt-4
pt-6
px-1
px-1.5
px-2
px-3
px-4
px-5
px-6
px-8
py-0.5
py-1
py-12
py-2
py-3
py-4
py-6
py-8
relative
rounded
rounded-full
rounded-lg
rounded-md
rounded-xl
shadow-sm
shadow-md
shrink-0
space-x-4
space-y-3
space-y-4
space-y-6
sticky
text-2xl
text-3xl
text-4xl
text-amber-700
text-base
text-blue-500
text-blue-700
text-blue-800
text-center
text-green-400
text-green-500
text-left
text-orange-800
text-red-400
text-red-500
text-red-600
text-right
text-slate-600
text-sm
text-xl
tracking-tight
tracking-wide
tracking-wider
transition-all
transition-colors
transition-opacity
truncate
uppercase
w-1.5
w-16
w-2
w-20
w-32
w-40
w-48
w-8
w-full
`;

let css = `/* Tailwind Shims generated for DevSync UI */\n\n`;

const generateCss = (cls) => {
    let out = `.${cls.replace(/[:.\/\[\]]/g, '\\$&')} { `;
    
    if (cls.match(/^m([trblxy]?)-(\d+(\.\d+)?)$/)) {
        let [, dir, val] = cls.match(/^m([trblxy]?)-(\d+(\.\d+)?)$/);
        val = (parseFloat(val) * 0.25) + 'rem';
        if (dir === 't') out += `margin-top: ${val};`;
        else if (dir === 'b') out += `margin-bottom: ${val};`;
        else if (dir === 'l') out += `margin-left: ${val};`;
        else if (dir === 'r') out += `margin-right: ${val};`;
        else if (dir === 'x') out += `margin-left: ${val}; margin-right: ${val};`;
        else if (dir === 'y') out += `margin-top: ${val}; margin-bottom: ${val};`;
        else out += `margin: ${val};`;
    }
    else if (cls.match(/^p([trblxy]?)-(\d+(\.\d+)?)$/)) {
        let [, dir, val] = cls.match(/^p([trblxy]?)-(\d+(\.\d+)?)$/);
        val = (parseFloat(val) * 0.25) + 'rem';
        if (dir === 't') out += `padding-top: ${val};`;
        else if (dir === 'b') out += `padding-bottom: ${val};`;
        else if (dir === 'l') out += `padding-left: ${val};`;
        else if (dir === 'r') out += `padding-right: ${val};`;
        else if (dir === 'x') out += `padding-left: ${val}; padding-right: ${val};`;
        else if (dir === 'y') out += `padding-top: ${val}; padding-bottom: ${val};`;
        else out += `padding: ${val};`;
    }
    else if (cls === 'mx-auto') out += `margin-left: auto; margin-right: auto;`;
    else if (cls === 'w-full') out += `width: 100%;`;
    else if (cls === 'h-full') out += `height: 100%;`;
    else if (cls.match(/^w-(\d+(\.\d+)?)$/)) {
        let val = parseFloat(cls.split('-')[1]) * 0.25;
        out += `width: ${val}rem;`;
    }
    else if (cls.match(/^h-(\d+(\.\d+)?)$/)) {
        let val = parseFloat(cls.split('-')[1]) * 0.25;
        out += `height: ${val}rem;`;
    }
    else if (cls === 'h-px') out += `height: 1px;`;
    else if (cls === 'max-w-7xl') out += `max-width: 80rem;`;
    else if (cls === 'max-w-2xl') out += `max-width: 42rem;`;
    else if (cls === 'max-w-lg') out += `max-width: 32rem;`;
    else if (cls === 'max-w-md') out += `max-width: 28rem;`;
    else if (cls === 'max-w-sm') out += `max-width: 24rem;`;
    else if (cls.match(/^min-w-\[([^\]]+)\]$/)) out += `min-width: ${cls.match(/^min-w-\[([^\]]+)\]$/)[1]};`;
    else if (cls.match(/^min-h-\[([^\]]+)\]$/)) out += `min-height: ${cls.match(/^min-h-\[([^\]]+)\]$/)[1]};`;
    else if (cls === 'block') out += `display: block;`;
    else if (cls === 'inline-block') out += `display: inline-block;`;
    else if (cls === 'flex') out += `display: flex;`;
    else if (cls === 'hidden') out += `display: none;`;
    else if (cls === 'flex-1') out += `flex: 1 1 0%;`;
    else if (cls === 'flex-col') out += `flex-direction: column;`;
    else if (cls === 'flex-wrap') out += `flex-wrap: wrap;`;
    else if (cls === 'items-center') out += `align-items: center;`;
    else if (cls === 'items-start') out += `align-items: flex-start;`;
    else if (cls === 'justify-between') out += `justify-content: space-between;`;
    else if (cls === 'justify-center') out += `justify-content: center;`;
    else if (cls === 'justify-end') out += `justify-content: flex-end;`;
    else if (cls === 'shrink-0') out += `flex-shrink: 0;`;
    else if (cls === 'text-sm') out += `font-size: 0.875rem; line-height: 1.25rem;`;
    else if (cls === 'text-base') out += `font-size: 1rem; line-height: 1.5rem;`;
    else if (cls === 'text-lg') out += `font-size: 1.125rem; line-height: 1.75rem;`;
    else if (cls === 'text-xl') out += `font-size: 1.25rem; line-height: 1.75rem;`;
    else if (cls === 'text-2xl') out += `font-size: 1.5rem; line-height: 2rem;`;
    else if (cls === 'text-3xl') out += `font-size: 1.875rem; line-height: 2.25rem;`;
    else if (cls === 'text-4xl') out += `font-size: 2.25rem; line-height: 2.5rem;`;
    else if (cls === 'leading-none') out += `line-height: 1;`;
    else if (cls === 'tracking-tight') out += `letter-spacing: -0.025em;`;
    else if (cls === 'tracking-wide') out += `letter-spacing: 0.025em;`;
    else if (cls === 'tracking-wider') out += `letter-spacing: 0.05em;`;
    else if (cls === 'uppercase') out += `text-transform: uppercase;`;
    else if (cls === 'text-center') out += `text-align: center;`;
    else if (cls === 'text-left') out += `text-align: left;`;
    else if (cls === 'text-right') out += `text-align: right;`;
    else if (cls === 'truncate') out += `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
    else if (cls === 'relative') out += `position: relative;`;
    else if (cls === 'absolute') out += `position: absolute;`;
    else if (cls === 'sticky') out += `position: sticky;`;
    else if (cls === 'bg-white') out += `background-color: #ffffff;`;
    else if (cls === 'bg-gray-50' || cls === 'bg-slate-50') out += `background-color: #f9fafb;`;
    else if (cls === 'bg-gray-100' || cls === 'bg-slate-100') out += `background-color: #f3f4f6;`;
    else if (cls === 'bg-blue-50') out += `background-color: #eff6ff;`;
    else if (cls === 'bg-blue-500') out += `background-color: #3b82f6;`;
    else if (cls === 'bg-green-50') out += `background-color: #f0fdf4;`;
    else if (cls === 'bg-green-500') out += `background-color: #22c55e;`;
    else if (cls === 'bg-red-50') out += `background-color: #fef2f2;`;
    else if (cls === 'bg-amber-50') out += `background-color: #fffbeb;`;
    else if (cls === 'text-blue-500') out += `color: #3b82f6;`;
    else if (cls === 'text-blue-700') out += `color: #1d4ed8;`;
    else if (cls === 'text-blue-800') out += `color: #1e40af;`;
    else if (cls === 'text-green-400') out += `color: #4ade80;`;
    else if (cls === 'text-green-500') out += `color: #22c55e;`;
    else if (cls === 'text-red-400') out += `color: #f87171;`;
    else if (cls === 'text-red-500') out += `color: #ef4444;`;
    else if (cls === 'text-red-600') out += `color: #dc2626;`;
    else if (cls === 'text-slate-600') out += `color: #475569;`;
    else if (cls === 'text-orange-800') out += `color: #9a3412;`;
    else if (cls === 'text-amber-700') out += `color: #b45309;`;
    else if (cls === 'border') out += `border-width: 1px;`;
    else if (cls === 'border-0') out += `border-width: 0px;`;
    else if (cls === 'border-2') out += `border-width: 2px;`;
    else if (cls === 'border-b') out += `border-bottom-width: 1px;`;
    else if (cls === 'border-t') out += `border-top-width: 1px;`;
    else if (cls === 'border-none') out += `border-style: none;`;
    else if (cls === 'border-dashed') out += `border-style: dashed;`;
    else if (cls === 'border-gray-50') out += `border-color: #f9fafb;`;
    else if (cls === 'border-gray-100') out += `border-color: #f3f4f6;`;
    else if (cls === 'border-gray-200' || cls === 'border-slate-200') out += `border-color: #e5e7eb;`;
    else if (cls === 'border-blue-200') out += `border-color: #bfdbfe;`;
    else if (cls === 'border-blue-300') out += `border-color: #93c5fd;`;
    else if (cls === 'border-green-100') out += `border-color: #dcfce7;`;
    else if (cls === 'border-red-100') out += `border-color: #fee2e2;`;
    else if (cls === 'border-orange-200') out += `border-color: #fed7aa;`;
    else if (cls === 'border-amber-200') out += `border-color: #fde68a;`;
    else if (cls === 'rounded') out += `border-radius: 0.25rem;`;
    else if (cls === 'rounded-md') out += `border-radius: 0.375rem;`;
    else if (cls === 'rounded-lg') out += `border-radius: 0.5rem;`;
    else if (cls === 'rounded-xl') out += `border-radius: 0.75rem;`;
    else if (cls === 'rounded-full') out += `border-radius: 9999px;`;
    else if (cls === 'cursor-pointer') out += `cursor: pointer;`;
    else if (cls === 'pointer-events-none') out += `pointer-events: none;`;
    else if (cls === 'object-contain') out += `object-fit: contain;`;
    else if (cls === 'overflow-hidden') out += `overflow: hidden;`;
    else if (cls === 'overflow-auto') out += `overflow: auto;`;
    else if (cls === 'overflow-x-auto') out += `overflow-x: auto;`;
    else if (cls === 'overflow-y-auto') out += `overflow-y: auto;`;
    else if (cls === 'shadow-sm') out += `box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);`;
    else if (cls === 'shadow-md') out += `box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);`;
    else if (cls === 'transition-all') out += `transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms;`;
    else if (cls === 'transition-colors') out += `transition-property: color, background-color, border-color, text-decoration-color, fill, stroke; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms;`;
    else if (cls === 'transition-opacity') out += `transition-property: opacity; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms;`;
    else if (cls === '-translate-y-1/2') out += `transform: translateY(-50%);`;
    else if (cls === 'opacity-0') out += `opacity: 0;`;
    else if (cls === 'opacity-50') out += `opacity: 0.5;`;
    else if (cls === 'opacity-70') out += `opacity: 0.7;`;
    else if (cls === 'opacity-80') out += `opacity: 0.8;`;
    else return null; 
    
    out += ` }`;
    return out;
};

classes.split(/\r?\n/).map(c => c.trim()).filter(Boolean).forEach(cls => {
    let generated = generateCss(cls);
    if (generated) css += generated + '\n';
});

// Space utilities
css += `
.space-y-3 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.75rem; }
.space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: 1rem; }
.space-y-6 > :not([hidden]) ~ :not([hidden]) { margin-top: 1.5rem; }
.space-x-4 > :not([hidden]) ~ :not([hidden]) { margin-left: 1rem; }
`;

// Pseudo classes
css += `
.hover\\:bg-blue-50:hover { background-color: #eff6ff; }
.hover\\:bg-blue-light:hover { background-color: rgba(59, 130, 246, 0.2); }
.hover\\:bg-gray-50:hover { background-color: #f9fafb; }
.hover\\:bg-red-50:hover { background-color: #fef2f2; }
.hover\\:bg-slate-50:hover { background-color: #f8fafc; }
.hover\\:border-blue-400:hover { border-color: #60a5fa; }
.hover\\:border-blue-500:hover { border-color: #3b82f6; }
.hover\\:border-green-400:hover { border-color: #4ade80; }
.hover\\:border-orange-400:hover { border-color: #fb923c; }
.hover\\:border-purple-400:hover { border-color: #c084fc; }
.hover\\:opacity-100:hover { opacity: 1; }
.hover\\:shadow-md:hover { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
.hover\\:text-blue-600:hover { color: #2563eb; }
.hover\\:text-blue-700:hover { color: #1d4ed8; }
.hover\\:text-main:hover { color: var(--text-main); }
.hover\\:text-red-300:hover { color: #fca5a5; }
.hover\\:text-red-500:hover { color: #ef4444; }
.hover\\:-translate-y-1:hover { transform: translateY(-0.25rem); }
.last\\:border-0:last-child { border-width: 0; }
`;

// Group hover
css += `
.group:hover .group-hover\\:bg-blue-500 { background-color: #3b82f6; }
.group:hover .group-hover\\:bg-green-500 { background-color: #22c55e; }
.group:hover .group-hover\\:bg-orange-500 { background-color: #f97316; }
.group:hover .group-hover\\:bg-purple-500 { background-color: #a855f7; }
.group:hover .group-hover\\:opacity-100 { opacity: 1; }
.group:hover .group-hover\\:text-white { color: #ffffff; }
`;

// Responsive Media Queries
css += `
@media (min-width: 640px) {
  .sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (min-width: 768px) {
  .md\\:block { display: block !important; }
  .md\\:hidden { display: none !important; }
  .md\\:col-span-2 { grid-column: span 2 / span 2; }
  .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .md\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .md\\:grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
}
@media (min-width: 1024px) {
  .lg\\:col-span-1 { grid-column: span 1 / span 1; }
  .lg\\:col-span-2 { grid-column: span 2 / span 2; }
  .lg\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .lg\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
`;

fs.writeFileSync('frontend/src/tailwind-shims.css', css);
console.log('Shims generated.');
