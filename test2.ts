import "dotenv/config"

import { Chariow }
from "./src"

import { cleanHtml }
from "./src/utils/cleanHtml"

async function main() {

  const api = new Chariow(
    process.env.CHARIOW_API_KEY!
  )

  const products =
    await api.products.list()

  for (const product of products.data) {

    console.log("----------")

    console.log(
      "Name:",
      product.name
    )

    console.log(
      cleanHtml(
        product.description
      )
      .slice(0, 400)
    )

    console.log(
      "Status:",
      product.status
    )

    console.log(
      "Category:",
      product.category.label
    )

    console.log(
      "Thumbnail:",
      product.pictures.thumbnail
    )

    console.log(
      "CTA:",
      product.custom_cta_text?.label
    )
  }
}

main()
