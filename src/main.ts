import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { ensureHash } from '$lib/router/router.svelte';
import { boot } from '$lib/stores/store.svelte';

ensureHash();
void boot(); // hydrate persistence + content; App reacts to app.loading/ready

const target = document.getElementById('app');
if (!target) throw new Error('#app mount node not found');

const app = mount(App, { target });

export default app;
