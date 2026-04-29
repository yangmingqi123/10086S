
export async function readBodyMassData() {
  try {
    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999)
    // 30 days ago
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
    const result = await Health.queryQuantitySamples("bodyMass", {
      startDate,
      endDate,
      strictEndDate: true,
      strictStartDate: true,
      sortDescriptors: [
        {
          key: "startDate",
          order: "reverse"
        }
      ],
    })
    return result
  } catch (error) {
    console.error("Error reading body mass data:", error)
    return []
  }
}

export async function writeBodyMassData(bodyMass: number): Promise<HealthQuantitySample | null> {
  try {
    const sample = HealthQuantitySample.create({
      type: "bodyMass",
      value: bodyMass,
      unit: HealthUnit.gramUnit(HealthMetricPrefix.kilo),
      startDate: new Date(),
      endDate: new Date(),
    })
    if (sample == null) {
      throw new Error("Failed to create body mass sample")
    }
    await Health.saveQuantitySample(sample)
    return sample
  } catch (error) {
    console.error("Error writing body mass data:", error)
    return null
  }
}