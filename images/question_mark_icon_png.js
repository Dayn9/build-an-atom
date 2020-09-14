/* eslint-disable */
import simLauncher from '../../joist/js/simLauncher.js';

const image = new Image();
const unlock = simLauncher.createLock( image );
image.onload = unlock;
image.src = 'data:image/png;base64,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';
export default image;