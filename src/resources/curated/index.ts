import modules from './modules.json';
import tailLicense from './upstream/tailblocks-LICENSE.txt?raw';
import hyperLicense from './upstream/hyperui-LICENSE.txt?raw';
import type {StudioModule} from '../../core/types';
export const CURATED_BLOCKS:StudioModule[]=modules;
export const CURATED_NOTICE=`Curated blocks adapted from mertJF/tailblocks and markmead/hyperui. Pinned source and SHA-256 in src/resources/curated/upstream/provenance.json. Tailwind CSS compiled at build time; no CDN required.\n\n${tailLicense}\n\n${hyperLicense}`;
