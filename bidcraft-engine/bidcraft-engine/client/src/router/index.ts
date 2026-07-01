import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import GameView from '../views/GameView.vue'
import ScoreView from '../views/ScoreView.vue'
import { useGameStore } from '../stores/game'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/game',
      name: 'game',
      component: GameView,
      beforeEnter: () => {
        const store = useGameStore()
        if (!store.gameState) return { name: 'home' }
      },
    },
    {
      path: '/score',
      name: 'score',
      component: ScoreView,
      beforeEnter: () => {
        const store = useGameStore()
        if (!store.finalScores) return { name: 'game' }
      },
    },
  ],
})

export default router
