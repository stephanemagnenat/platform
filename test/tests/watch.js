export default function () {
  describe('Watchers', function () {

    it(
      'Gets the expected number of updates',
      async function () {
        const expectedUpdateOrder = [0, 1, 2, 3]
        const updateOrder = []

        let resolveExpectedUpdates
        const expectedUpdatesPromise = new Promise(r => resolveExpectedUpdates = r)

        const id = uuid()
        const state = await Agent.state(id)
        Agent
          .watch(id, async ({ ii }) => {
            updateOrder.push(ii)
            if (updateOrder.length === expectedUpdateOrder.length) {
              await new Promise(r => setTimeout(r, 10))
              resolveExpectedUpdates()
            }
          })

        Object.assign(state, {x:1, y:2, z:3})

        await expectedUpdatesPromise

        expect(updateOrder).to.deep.equal(expectedUpdateOrder)
      }
    )

    it(
      'Closes a listening connection after a close call',
      async function () {
        this.timeout(5000)

        const EXPECTED_UPDATES = 4
        const id = uuid()
        const state = await Agent.state(id)
        let updatesSeen = 0

        let resolveThirdUpdate
        const thirdUpdatePromise = new Promise(r => resolveThirdUpdate = r)

        // set up one watcher
        const unwatch = (
          Agent
            .watch(id, (update) => {
              updatesSeen += 1
              if (updatesSeen === EXPECTED_UPDATES) resolveThirdUpdate()
            })
        )

        Object.assign(state, {x:1,y:2,z:3})

        // unwatch after 3 updates
        await thirdUpdatePromise
        unwatch()

        let resolveAfterUnwatchPromise
        const finalUpdatesPromise = new Promise(r => resolveAfterUnwatchPromise = r)

        const expectedValues = {x:2,y:3,z:4}
        Object.assign(state, expectedValues)

        //  set up another watcher
        let afterUnwatchUpdates = 0
        const finalStatePromise = Agent.state(id)
        const unwatch2 = Agent.watch(id, () => {
          afterUnwatchUpdates += 1
          if (afterUnwatchUpdates === 3) resolveAfterUnwatchPromise()
        })
        await finalUpdatesPromise
        unwatch2()

        const finalState = await finalStatePromise
        expect(finalState).to.deep.equal(expectedValues)

        //  make sure first watcher didn't get any other updates
        expect(updatesSeen).to.equal(EXPECTED_UPDATES)
      }
    )
  })
}
