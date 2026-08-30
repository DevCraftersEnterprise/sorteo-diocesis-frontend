import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import HomeView from './HomeView.vue';

describe('HomeView', () => {
  it('muestra el título del sorteo', () => {
    const wrapper = mount(HomeView);

    expect(wrapper.text()).toContain('Sorteo Diócesis de Ciudad Obregón');
  });
});
