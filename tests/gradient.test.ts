import {it,expect} from 'vitest';
import {DEFAULT_GRADIENT,isEditableGradient,normalizePickedGradient} from '../src/core/gradient';
it('keeps imported CSS out of the editor library HTML rendering boundary',()=>{
 expect(isEditableGradient(DEFAULT_GRADIENT)).toBe(true);
 for(const value of ['url(https://example.com/a.png)','linear-gradient(90deg, red 0%, blue 100%)','linear-gradient(90deg, #ffffff 101%, #000000 0%)',`linear-gradient(90deg, <img src=x onerror=alert(1)> 0%, #000000 100%)`,'linear-gradient(999deg, #ffffff 0%, #000000 100%)'])expect(isEditableGradient(value)).toBe(false);
});

it('normalizes native picker canvas samples before saving or reopening stops',()=>{expect(normalizePickedGradient('linear-gradient(90deg, rgba(18, 20, 0, 255) 0%, #000 100%)')).toBe('linear-gradient(90deg, #121400 0%, #000000 100%)');});
