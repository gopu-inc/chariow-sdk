import "dotenv/config"

import { Chariow } from "chariow-sdk"

async function main() {

  const api = new Chariow(
    process.env.CHARIOW_API_KEY!
  )

  const products =
    await api.products.list({
      per_page: 5
    })

  console.log(
    products.data.map(p => ({
      id: p.id,
      name: p.name,
      status: p.status
    }))
  )
}

main()
